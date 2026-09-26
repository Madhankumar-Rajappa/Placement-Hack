// ============================================================
// PlacementOS — Resume Service
// ============================================================

import { supabase } from '../lib/supabase';
import type { Resume, ResumeAnalysis } from '../types';
import { aiService } from './ai.service';

const BUCKET = 'resumes';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const resumeService = {
  async upload(userId: string, file: File): Promise<Resume> {
    // Validate
    if (file.type !== 'application/pdf') {
      throw new Error('Only PDF files are accepted');
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('File size must be less than 5MB');
    }

    const fileName = `${userId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, file, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // Create DB record
    try {
      const { data, error } = await supabase
        .from('resumes')
        .insert({
          user_id: userId,
          file_name: file.name,
          storage_path: fileName,
          analysis_status: 'pending',
        })
        .select()
        .single();

      if (error) {
        console.warn('Supabase DB resumes insert notice:', error.message);
      } else if (data) {
        return data;
      }
    } catch (dbErr) {
      console.warn('Database error while saving resume record:', dbErr);
    }

    // Fallback local record if table not yet created in Supabase SQL editor
    const fallbackRecord: Resume = {
      id: `res_${Date.now()}`,
      user_id: userId,
      file_name: file.name,
      storage_path: fileName,
      parsed_text: null,
      analysis_status: 'pending',
      analysis_json: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      localStorage.setItem(`placementos_resume_${userId}`, JSON.stringify(fallbackRecord));
    } catch {
      // ignore
    }

    return fallbackRecord;
  },

  async getByUser(userId: string): Promise<Resume | null> {
    try {
      const { data, error } = await supabase
        .from('resumes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        return data;
      }
    } catch (e) {
      console.warn('Database query for resume:', e);
    }

    // Check local storage fallback
    try {
      const stored = localStorage.getItem(`placementos_resume_${userId}`);
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }

    return null;
  },

  async getAll(userId: string): Promise<Resume[]> {
    try {
      const { data, error } = await supabase
        .from('resumes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data;
      }
    } catch (e) {
      console.warn('Database query for resumes list:', e);
    }

    try {
      const stored = localStorage.getItem(`placementos_resume_${userId}`);
      return stored ? [JSON.parse(stored)] : [];
    } catch {
      return [];
    }
  },

  async delete(resumeId: string, storagePath: string) {
    // Delete from storage
    await supabase.storage.from(BUCKET).remove([storagePath]);

    // Delete from DB
    const { error } = await supabase
      .from('resumes')
      .delete()
      .eq('id', resumeId);

    if (error) throw error;
  },

  async getDownloadUrl(storagePath: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, 3600);

    if (error) throw error;
    return data.signedUrl;
  },

  async analyze(resumeId: string, parsedText: string): Promise<ResumeAnalysis> {
    // Update status
    try {
      await supabase
        .from('resumes')
        .update({
          analysis_status: 'processing',
          parsed_text: parsedText,
          updated_at: new Date().toISOString(),
        })
        .eq('id', resumeId);
    } catch {
      // ignore
    }

    try {
      const analysis = await aiService.analyzeResume(parsedText);

      // Save analysis to DB
      try {
        await supabase
          .from('resumes')
          .update({
            analysis_status: 'completed',
            analysis_json: analysis,
            updated_at: new Date().toISOString(),
          })
          .eq('id', resumeId);
      } catch {
        // ignore
      }

      // Also update local storage cache
      try {
        const keys = Object.keys(localStorage).filter(k => k.startsWith('placementos_resume_'));
        for (const k of keys) {
          const item = JSON.parse(localStorage.getItem(k) || '{}');
          if (item.id === resumeId) {
            item.analysis_status = 'completed';
            item.analysis_json = analysis;
            item.parsed_text = parsedText;
            localStorage.setItem(k, JSON.stringify(item));
          }
        }
      } catch {
        // ignore
      }

      return analysis;
    } catch (err) {
      try {
        await supabase
          .from('resumes')
          .update({
            analysis_status: 'failed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', resumeId);
      } catch {
        // ignore
      }
      throw err;
    }
  },

  async analyzePdfBase64(resumeId: string, base64: string): Promise<ResumeAnalysis> {
    try {
      await supabase
        .from('resumes')
        .update({
          analysis_status: 'processing',
          updated_at: new Date().toISOString(),
        })
        .eq('id', resumeId);
    } catch {
      // ignore
    }

    try {
      const analysis = await aiService.analyzeResumePdfBase64(base64);

      // Save analysis to DB
      try {
        await supabase
          .from('resumes')
          .update({
            analysis_status: 'completed',
            analysis_json: analysis,
            updated_at: new Date().toISOString(),
          })
          .eq('id', resumeId);
      } catch {
        // ignore
      }

      // Also update local storage cache
      try {
        const keys = Object.keys(localStorage).filter(k => k.startsWith('placementos_resume_'));
        for (const k of keys) {
          const item = JSON.parse(localStorage.getItem(k) || '{}');
          if (item.id === resumeId) {
            item.analysis_status = 'completed';
            item.analysis_json = analysis;
            localStorage.setItem(k, JSON.stringify(item));
          }
        }
      } catch {
        // ignore
      }

      return analysis;
    } catch (err) {
      try {
        await supabase
          .from('resumes')
          .update({
            analysis_status: 'failed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', resumeId);
      } catch {
        // ignore
      }
      throw err;
    }
  },

  async extractTextFromPdf(file: File): Promise<string> {
    // Client-side PDF text extraction using pdf.js-like approach
    // We read the file as array buffer and extract text
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Simple text extraction from PDF binary
    // In production, use a proper PDF parser via Edge Function
    let text = '';
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const rawText = decoder.decode(uint8Array);
    
    // Extract text between BT/ET markers (basic PDF text extraction)
    const textMatches = rawText.match(/\(([^)]+)\)/g);
    if (textMatches) {
      text = textMatches
        .map(m => m.slice(1, -1))
        .filter(t => t.length > 1 && /[a-zA-Z]/.test(t))
        .join(' ');
    }

    // If basic extraction fails, try stream-based extraction
    if (text.length < 50) {
      const streamMatches = rawText.match(/stream\s*([\s\S]*?)\s*endstream/g);
      if (streamMatches) {
        for (const match of streamMatches) {
          const content = match.replace(/^stream\s*/, '').replace(/\s*endstream$/, '');
          const printable = content.replace(/[^\x20-\x7E\n\r\t]/g, ' ').trim();
          if (printable.length > 10) {
            text += ' ' + printable;
          }
        }
      }
    }

    // Fallback: extract all printable strings
    if (text.length < 50) {
      const printableStrings = rawText.match(/[\x20-\x7E]{4,}/g);
      if (printableStrings) {
        text = printableStrings
          .filter(s => /[a-zA-Z]{2,}/.test(s) && !s.startsWith('/') && !s.startsWith('%'))
          .join(' ');
      }
    }

    return text.replace(/\s+/g, ' ').trim() || 'Unable to extract text from PDF. Please provide text manually.';
  },
};

// Audio Storage Service - Upload and retrieve audio from Supabase Storage
import { supabase } from './supabase';

const BUCKET_NAME = 'quiz-assets';
const AUDIO_PATH_PREFIX = 'audio/listening';

/**
 * Convert HTMLAudioElement to Blob for upload
 */
const audioElementToBlob = async (audio: HTMLAudioElement): Promise<Blob> => {
    // If audio has a blob URL, fetch it
    if (audio.src.startsWith('blob:')) {
        const response = await fetch(audio.src);
        return await response.blob();
    }

    // If audio has a data URL, convert it
    if (audio.src.startsWith('data:')) {
        const response = await fetch(audio.src);
        return await response.blob();
    }

    // Otherwise, fetch the audio source
    const response = await fetch(audio.src);
    return await response.blob();
};

/**
 * Upload audio to Supabase Storage
 * @param questionId - Unique question ID
 * @param audio - HTMLAudioElement or Blob
 * @returns Public URL of uploaded audio
 */
export const uploadAudioToStorage = async (
    questionId: string,
    audio: HTMLAudioElement | Blob
): Promise<string> => {
    try {
        // Convert to Blob if needed
        const blob = audio instanceof Blob
            ? audio
            : await audioElementToBlob(audio);

        const filePath = `${AUDIO_PATH_PREFIX}/${questionId}.mp3`;

        console.log(`📤 Uploading audio to: ${filePath}`);

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(filePath, blob, {
                contentType: 'audio/mpeg',
                upsert: true, // Overwrite if exists
                cacheControl: '3600' // Cache for 1 hour
            });

        if (error) {
            console.error('❌ Upload failed:', error);
            throw error;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(filePath);

        console.log(`✅ Audio uploaded: ${urlData.publicUrl}`);
        return urlData.publicUrl;

    } catch (error) {
        console.error('❌ Audio upload error:', error);
        throw error;
    }
};

/**
 * Get stored audio URL from Supabase
 * @param questionId - Unique question ID
 * @returns Public URL or null if not found
 */
export const getStoredAudioUrl = async (questionId: string): Promise<string | null> => {
    try {
        const filePath = `${AUDIO_PATH_PREFIX}/${questionId}.mp3`;

        // Check if file exists
        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .list(AUDIO_PATH_PREFIX, {
                search: `${questionId}.mp3`
            });

        if (error || !data || data.length === 0) {
            return null;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(filePath);

        return urlData.publicUrl;

    } catch (error) {
        console.error('❌ Error getting stored audio:', error);
        return null;
    }
};

/**
 * Check if audio exists in storage
 * @param questionId - Unique question ID
 * @returns True if audio exists
 */
export const hasStoredAudio = async (questionId: string): Promise<boolean> => {
    const url = await getStoredAudioUrl(questionId);
    return url !== null;
};

/**
 * Update question_bank with audio URL
 * Updates stimulus.audio_url (JSONB field)
 * @param questionId - Question UUID
 * @param audioUrl - Public URL from Supabase Storage
 */
export const updateQuestionAudioUrl = async (
    questionId: string,
    audioUrl: string
): Promise<void> => {
    try {
        // Use raw SQL to update JSONB field stimulus.audio_url
        const { error } = await supabase.rpc('update_question_audio_url', {
            question_id: questionId,
            new_audio_url: audioUrl
        });

        if (error) {
            // Fallback: try direct update with jsonb_set via supabase
            console.log('⚠️ RPC not available, using direct query...');

            // Fetch current stimulus, update it, and save
            const { data: current, error: fetchError } = await supabase
                .from('question_bank')
                .select('stimulus')
                .eq('id', questionId)
                .single();

            if (fetchError) throw fetchError;

            const updatedStimulus = {
                ...current?.stimulus,
                audio_url: audioUrl
            };

            const { error: updateError } = await supabase
                .from('question_bank')
                .update({ stimulus: updatedStimulus })
                .eq('id', questionId);

            if (updateError) throw updateError;
        }

        console.log(`✅ Updated question ${questionId} with audio URL`);

    } catch (error) {
        console.error('❌ Error updating question audio URL:', error);
        throw error;
    }
};

/**
 * Get audio URL from question_bank
 * @param questionId - Question UUID
 * @returns Audio URL or null
 */
export const getQuestionAudioUrl = async (questionId: string): Promise<string | null> => {
    try {
        const { data, error } = await supabase
            .from('question_bank')
            .select('audio_url')
            .eq('id', questionId)
            .single();

        if (error || !data) {
            return null;
        }

        return data.audio_url;

    } catch (error) {
        console.error('❌ Error getting question audio URL:', error);
        return null;
    }
};

/**
 * Web Worker для вычисления эмбеддингов описаний газов
 * Использует модель SigLIP из библиотеки @huggingface/transformers
 */

import { 
    env, 
    AutoTokenizer, 
    SiglipTextModel,
} from '@huggingface/transformers';

env.allowLocalModels = false;
env.allowRemoteModels = true;

const MODEL_ID = 'Xenova/siglip-base-patch16-224';

/**
 * Singleton сервис для работы с моделью SigLIP
 * Загружает модель один раз и хранит её в памяти
 */
class SiglipService {
    static tokenizer: any = null;
    static textModel: any = null;

    static async init(progress_callback?: (data: any) => void) {
        if (!this.tokenizer) {
            // Используем q8 для баланса качества и скорости
            const options = { device: 'wasm', dtype: 'q8' } as const;

            this.tokenizer = await AutoTokenizer.from_pretrained(MODEL_ID, { progress_callback });
            this.textModel = await SiglipTextModel.from_pretrained(MODEL_ID, {...options, progress_callback });
        }
    }
}

/**
 * Обработчик сообщений от основного потока
 */
self.addEventListener('message', async (event) => {
    const { type, data } = event.data;

    try {
        // Инициализация модели и вычисление эмбеддингов для всех описаний
        if (type === 'init') {
            await SiglipService.init((msg) => {
                self.postMessage({ type: 'progress', data: msg });
            });

            const items = data;
            const embeddings: Record<number, number[]> = {};

            // Получаем все английские описания
            // Если description_en отсутствует, используем description (на случай, если оно на английском)
            const descriptions = items.map((item: any) => 
                item.description_en || item.description || ''
            ).filter((desc: string) => desc.length > 0);
            
            if (descriptions.length === 0) {
                self.postMessage({ type: 'text_embeddings_ready', data: embeddings });
                return;
            }

            // Токенизация всех описаний разом
            // max_length нужен для одинаковой длины всех входов
            const text_inputs = await SiglipService.tokenizer(descriptions, { 
                padding: 'max_length', 
                truncation: true,
            });

            // Получаем выход текстовой модели
            // Мы заэмбеддили все описания за раз, получив один большой эмбеддинг
            const { pooler_output: textOutput } = await SiglipService.textModel(text_inputs);

            // Размерность выхода SigLIP base = 768
            const embeddingSize = 768; 

            // Разделяем общий эмбеддинг на отдельные векторы для каждого описания
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                // Пропускаем элементы без описания
                if (!item.description_en && !item.description) continue;

                const start = i * embeddingSize;
                const end = start + embeddingSize;
                // Этот кусок - вектор для одного описания
                const textVector = textOutput.data.slice(start, end);
                
                const itemId = item.id; 
                embeddings[itemId] = Array.from(textVector);
            }

            self.postMessage({ type: 'text_embeddings_ready', data: embeddings });
        }

    } catch (error) {
        console.error('Error in search worker:', error);
        self.postMessage({ type: 'error', data: error instanceof Error ? error.message : String(error) });
    }
});


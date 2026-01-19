/**
 * Хук для поиска похожих газов на основе эмбеддингов описаний
 * Использует модель SigLIP для вычисления эмбеддингов и косинусное сходство для сравнения
 */

import { useState, useRef, useEffect } from 'react';
import { Gas } from '../components/GasCard';
import { cosineSimilarity } from '../modules/math';

export interface SimilarGas extends Gas {
    similarity: number; // Значение косинусного сходства (0-1)
}

export const useSimilarGases = (allGases: Gas[], currentGasId: number | null) => {
    const [similarGases, setSimilarGases] = useState<SimilarGas[]>([]);
    const [ready, setReady] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    
    const workerRef = useRef<Worker | null>(null);
    const embeddingsRef = useRef<Record<number, number[]>>({});

    // Инициализация worker и вычисление эмбеддингов
    useEffect(() => {
        if (allGases.length === 0) return;

        workerRef.current = new Worker(
            new URL('../workers/search.worker.ts', import.meta.url),
            { type: 'module' }
        );

        workerRef.current.onmessage = (e) => {
            const { type, data } = e.data;

            switch (type) {
                case 'progress':
                    if (data.status === 'progress') {
                        setProgress(data.progress || 0);
                    } else if (data.status === 'ready') {
                        setReady(true);
                    }
                    break;
                
                case 'text_embeddings_ready':
                    // Сохраняем эмбеддинги для всех газов
                    embeddingsRef.current = data;
                    
                    // Обновляем газы с эмбеддингами
                    const gasesWithEmbeddings = allGases.map(gas => ({
                        ...gas,
                        embedding: data[gas.id] || undefined
                    }));
                    
                    setReady(true);
                    setProgress(100);
                    
                    // Если есть текущий газ, сразу вычисляем похожие
                    if (currentGasId) {
                        findSimilarGases(gasesWithEmbeddings, currentGasId, data);
                    }
                    break;

                case 'error':
                    setError(data);
                    setReady(false);
                    console.error('Worker error:', data);
                    break;
            }
        };

        workerRef.current.onerror = (error) => {
            setError('Worker initialization failed');
            console.error('Worker error:', error);
        };

        // Отправляем запрос на инициализацию
        workerRef.current.postMessage({ type: 'init', data: allGases });

        return () => {
            workerRef.current?.terminate();
        };
    }, [allGases]);

    /**
     * Функция для поиска похожих газов
     */
    const findSimilarGases = (
        gases: Gas[], 
        targetGasId: number, 
        embeddings: Record<number, number[]>
    ) => {
        const targetGas = gases.find(g => g.id === targetGasId);
        if (!targetGas) {
            setSimilarGases([]);
            return;
        }

        const targetEmbedding = embeddings[targetGasId];
        if (!targetEmbedding) {
            setSimilarGases([]);
            return;
        }

        // Вычисляем сходство для всех газов, кроме текущего
        const similar: SimilarGas[] = gases
            .filter(gas => gas.id !== targetGasId && embeddings[gas.id])
            .map(gas => {
                const similarity = cosineSimilarity(targetEmbedding, embeddings[gas.id]!);
                return {
                    ...gas,
                    similarity
                };
            })
            .filter(gas => gas.similarity > 0.1) // Фильтруем по порогу сходства
            .sort((a, b) => b.similarity - a.similarity) // Сортируем по убыванию сходства
            .slice(0, 5); // Берем топ-5 похожих

        setSimilarGases(similar);
    };

    // Пересчитываем похожие газы при изменении текущего газа
    useEffect(() => {
        if (!currentGasId || !ready || Object.keys(embeddingsRef.current).length === 0) {
            setSimilarGases([]);
            return;
        }

        const gasesWithEmbeddings = allGases.map(gas => ({
            ...gas,
            embedding: embeddingsRef.current[gas.id] || undefined
        }));

        findSimilarGases(gasesWithEmbeddings, currentGasId, embeddingsRef.current);
    }, [currentGasId, ready, allGases]);

    return {
        similarGases,
        ready,
        progress,
        error
    };
};


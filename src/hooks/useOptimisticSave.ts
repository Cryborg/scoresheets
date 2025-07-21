import { useCallback } from 'react';

interface OptimisticSaveOptions<T> {
  onOptimisticUpdate: (data: T) => void;
  onRevert: () => void;
  onError?: (error: string) => void;
}

export function useOptimisticSave<T>(options: OptimisticSaveOptions<T>) {
  const { onOptimisticUpdate, onRevert, onError } = options;

  const saveOptimistically = useCallback(async (
    data: T,
    saveFunction: () => Promise<Response>
  ) => {
    // 🚀 Apply optimistic update immediately
    onOptimisticUpdate(data);

    try {
      // 🔄 Execute save in background
      const response = await saveFunction();

      if (!response.ok) {
        // 🚨 Revert on server error
        onRevert();
        
        const errorData = await response.json();
        const errorMessage = errorData.error || 'Erreur lors de la sauvegarde';
        
        if (onError) {
          onError(errorMessage);
        } else {
          alert(`${errorMessage} - modifications annulées`);
        }
      }
      // ✅ Success - optimistic update is already applied
    } catch {
      // 🚨 Revert on network error
      onRevert();
      
      const errorMessage = 'Erreur de connexion';
      if (onError) {
        onError(errorMessage);
      } else {
        alert(`${errorMessage} - modifications annulées`);
      }
    }
  }, [onOptimisticUpdate, onRevert, onError]);

  return { saveOptimistically };
}
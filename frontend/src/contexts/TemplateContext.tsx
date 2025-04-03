import React, { createContext, useState, useContext, useEffect } from 'react';

// テンプレート型定義
export interface Template {
  id: string;
  name: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

// コンテキストの型定義
interface TemplateContextType {
  templates: Template[];
  selectedTemplate: Template | null;
  setSelectedTemplate: (template: Template | null) => void;
  addTemplate: (template: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Template>;
  updateTemplate: (template: Template) => Promise<Template>;
  deleteTemplate: (id: string) => Promise<boolean>;
  loadTemplates: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

// デフォルト値を持つコンテキストの作成
const TemplateContext = createContext<TemplateContextType>({
  templates: [],
  selectedTemplate: null,
  setSelectedTemplate: () => {},
  addTemplate: async () => ({ id: '', name: '', content: '', createdAt: '', updatedAt: '' }),
  updateTemplate: async () => ({ id: '', name: '', content: '', createdAt: '', updatedAt: '' }),
  deleteTemplate: async () => false,
  loadTemplates: async () => {},
  isLoading: false,
  error: null
});

// カスタムフックの作成
export const useTemplates = () => useContext(TemplateContext);

// プロバイダーのprops型定義
interface TemplateProviderProps {
  children: React.ReactNode;
}

// テンプレートプロバイダーコンポーネント
export const TemplateProvider: React.FC<TemplateProviderProps> = ({ children }) => {
  // 状態管理
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // テンプレート一覧を読み込む
  const loadTemplates = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      if (window.electronAPI) {
        // Electron APIを使用してバックエンドからテンプレートを取得
        const result = await window.electronAPI.callApi('templates', 'GET', {});
        
        if (result.success && Array.isArray(result.data)) {
          setTemplates(result.data);
          
          // 選択中のテンプレートが削除されていたらnullに設定
          if (selectedTemplate && !result.data.find((t: Template) => t.id === selectedTemplate.id)) {
            setSelectedTemplate(null);
          }
        } else {
          throw new Error('テンプレートの取得に失敗しました');
        }
      } else {
        // 開発モード用にローカルストレージから読み込み
        const savedTemplates = localStorage.getItem('tweet-templates');
        if (savedTemplates) {
          const parsed = JSON.parse(savedTemplates);
          setTemplates(Array.isArray(parsed) ? parsed : []);
        }
      }
    } catch (err) {
      console.error('テンプレート読み込みエラー:', err);
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  // テンプレートを追加
  const addTemplate = async (template: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>): Promise<Template> => {
    setIsLoading(true);
    setError(null);

    try {
      if (window.electronAPI) {
        // バックエンドAPIを使用してテンプレートを追加
        const result = await window.electronAPI.callApi('templates', 'POST', template);
        
        if (result.success && result.data) {
          // 新しいテンプレートを追加
          const newTemplate = result.data as Template;
          setTemplates(prev => [...prev, newTemplate]);
          return newTemplate;
        } else {
          throw new Error('テンプレートの追加に失敗しました');
        }
      } else {
        // 開発モード用にローカルで処理
        const newTemplate: Template = {
          ...template,
          id: `temp-${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        setTemplates(prev => [...prev, newTemplate]);
        
        // ローカルストレージに保存
        const updatedTemplates = [...templates, newTemplate];
        localStorage.setItem('tweet-templates', JSON.stringify(updatedTemplates));
        
        return newTemplate;
      }
    } catch (err) {
      console.error('テンプレート追加エラー:', err);
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // テンプレートを更新
  const updateTemplate = async (template: Template): Promise<Template> => {
    setIsLoading(true);
    setError(null);

    try {
      if (window.electronAPI) {
        // バックエンドAPIを使用してテンプレートを更新
        const result = await window.electronAPI.callApi('templates', 'PUT', template);
        
        if (result.success && result.data) {
          // 更新されたテンプレートで配列を更新
          const updatedTemplate = result.data as Template;
          setTemplates(prev => prev.map(t => t.id === template.id ? updatedTemplate : t));
          
          // 選択中のテンプレートも更新
          if (selectedTemplate && selectedTemplate.id === template.id) {
            setSelectedTemplate(updatedTemplate);
          }
          
          return updatedTemplate;
        } else {
          throw new Error('テンプレートの更新に失敗しました');
        }
      } else {
        // 開発モード用にローカルで処理
        const updatedTemplate: Template = {
          ...template,
          updatedAt: new Date().toISOString()
        };
        
        setTemplates(prev => prev.map(t => t.id === template.id ? updatedTemplate : t));
        
        // 選択中のテンプレートも更新
        if (selectedTemplate && selectedTemplate.id === template.id) {
          setSelectedTemplate(updatedTemplate);
        }
        
        // ローカルストレージに保存
        const updatedTemplates = templates.map(t => t.id === template.id ? updatedTemplate : t);
        localStorage.setItem('tweet-templates', JSON.stringify(updatedTemplates));
        
        return updatedTemplate;
      }
    } catch (err) {
      console.error('テンプレート更新エラー:', err);
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // テンプレートを削除
  const deleteTemplate = async (id: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      if (window.electronAPI) {
        // バックエンドAPIを使用してテンプレートを削除
        const result = await window.electronAPI.callApi('templates', 'DELETE', { id });
        
        if (result.success) {
          // 削除されたテンプレートを配列から除去
          setTemplates(prev => prev.filter(t => t.id !== id));
          
          // 選択中のテンプレートが削除された場合はnullに設定
          if (selectedTemplate && selectedTemplate.id === id) {
            setSelectedTemplate(null);
          }
          
          return true;
        } else {
          throw new Error('テンプレートの削除に失敗しました');
        }
      } else {
        // 開発モード用にローカルで処理
        setTemplates(prev => prev.filter(t => t.id !== id));
        
        // 選択中のテンプレートが削除された場合はnullに設定
        if (selectedTemplate && selectedTemplate.id === id) {
          setSelectedTemplate(null);
        }
        
        // ローカルストレージに保存
        const updatedTemplates = templates.filter(t => t.id !== id);
        localStorage.setItem('tweet-templates', JSON.stringify(updatedTemplates));
        
        return true;
      }
    } catch (err) {
      console.error('テンプレート削除エラー:', err);
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // 初回マウント時にテンプレートを読み込み
  useEffect(() => {
    loadTemplates();
  }, []);

  // コンテキストの値
  const value = {
    templates,
    selectedTemplate,
    setSelectedTemplate,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    loadTemplates,
    isLoading,
    error
  };

  return (
    <TemplateContext.Provider value={value}>
      {children}
    </TemplateContext.Provider>
  );
};

export default TemplateContext;

using System.Text;
using System.Text.Json;

namespace VSA_launcher
{
    /// <summary>
    /// 下位互換性のために残しているクラス - 内部でPngMetadataManagerに処理を委譲
    /// </summary>
    public static class SimplePngMetadataManager
    {
        // 処理済みマーカーキー
        private const string PROCESSED_KEY = "VSACheck";
        
        /// <summary>
        /// PNGファイルにメタデータを追加 - PngMetadataManagerに委譲
        /// </summary>
        public static bool AddMetadataToPng(string sourceFilePath, string targetFilePath, Dictionary<string, string> metadata)
        {
            return PngMetadataManager.AddMetadataToPng(sourceFilePath, targetFilePath, metadata);
        }
        
        /// <summary>
        /// PNGファイルからメタデータを読み取り - PngMetadataManagerに委譲
        /// </summary>
        public static Dictionary<string, string> ReadMetadataFromPng(string filePath)
        {
            return PngMetadataManager.ReadMetadataFromPng(filePath);
        }
        
        /// <summary>
        /// FileWatcherService との互換性のために追加
        /// </summary>
        public static Dictionary<string, string> ReadMetadata(string filePath)
        {
            return PngMetadataManager.ReadMetadata(filePath);
        }
        
        /// <summary>
        /// PNGファイルが処理済みかどうかを確認（ファイルロック回避版）
        /// </summary>
        public static bool IsProcessedFile(string filePath)
        {
            return PngMetadataManager.IsProcessedFile(filePath);
        }
        
        /// <summary>
        /// 既存のPNGファイルにメタデータを書き込む
        /// </summary>
        public static bool WriteMetadata(string filePath, Dictionary<string, string> metadata)
        {
            return PngMetadataManager.WriteMetadata(filePath, metadata);
        }
        
        /// <summary>
        /// VRChatログから取得したメタデータをPNGファイルに追加
        /// </summary>
        public static bool AddVRChatMetadataToPng(string sourceFilePath, string targetFilePath, 
            VRChatLogParser? logParser = null, Dictionary<string, string>? additionalMetadata = null)
        {
            return PngMetadataManager.AddVRChatMetadataToPng(sourceFilePath, targetFilePath, logParser, additionalMetadata);
        }
        
        /// <summary>
        /// 既存のPNGファイルにVRChatログから取得したメタデータを書き込む
        /// </summary>
        public static bool WriteVRChatMetadata(string filePath, 
            VRChatLogParser? logParser = null, Dictionary<string, string>? additionalMetadata = null)
        {
            return PngMetadataManager.WriteVRChatMetadata(filePath, logParser, additionalMetadata);
        }
        
        /// <summary>
        /// メタデータをテキストファイルにエクスポート
        /// </summary>
        public static string ExportMetadataToTextFile(string pngFilePath, string? exportPath = null)
        {
            return PngMetadataManager.ExportMetadataToTextFile(pngFilePath, exportPath);
        }
        
        /// <summary>
        /// 辞書をJSON形式の文字列に変換
        /// </summary>
        public static string DictionaryToJson(Dictionary<string, string> dict)
        {
            try
            {
                // System.Text.Jsonを使う場合
                return JsonSerializer.Serialize(dict);
            }
            catch
            {
                // フォールバック：簡易的なJSON構築
                StringBuilder sb = new StringBuilder("{");
                bool first = true;
                
                foreach (var pair in dict)
                {
                    if (!first) sb.Append(",");
                    first = false;
                    
                    string key = EscapeJsonString(pair.Key);
                    string value = EscapeJsonString(pair.Value ?? "");
                    
                    sb.Append($"\"{key}\":\"{value}\"");
                }
                
                sb.Append("}");
                return sb.ToString();
            }
        }
        
        /// <summary>
        /// JSON文字列をパース
        /// </summary>
        public static Dictionary<string, string> ParseJsonMetadata(string json)
        {
            Dictionary<string, string> result = new Dictionary<string, string>();
            
            try
            {
                // System.Text.Jsonを使う場合
                return JsonSerializer.Deserialize<Dictionary<string, string>>(json);
            }
            catch
            {
                // フォールバック：簡易的なJSONパース処理
                try
                {
                    if (json.StartsWith("{") && json.EndsWith("}"))
                    {
                        string content = json.Substring(1, json.Length - 2);
                        string[] pairs = SplitJsonPairs(content);
                        
                        foreach (string pair in pairs)
                        {
                            int colonIndex = FindUnescapedColon(pair);
                            if (colonIndex > 0)
                            {
                                string key = pair.Substring(0, colonIndex).Trim();
                                string value = pair.Substring(colonIndex + 1).Trim();
                                
                                // クオートを削除
                                if (key.StartsWith("\"") && key.EndsWith("\""))
                                    key = key.Substring(1, key.Length - 2);
                                
                                if (value.StartsWith("\"") && value.EndsWith("\""))
                                    value = value.Substring(1, value.Length - 2);
                                
                                // アンエスケープ
                                key = UnescapeJsonString(key);
                                value = UnescapeJsonString(value);
                                
                                result[key] = value;
                            }
                        }
                    }
                }
                catch { }
            }
            
            return result;
        }
        
        /// <summary>
        /// エスケープされていないコロンの位置を見つける
        /// </summary>
        private static int FindUnescapedColon(string text)
        {
            bool inQuote = false;
            bool escaped = false;
            
            for (int i = 0; i < text.Length; i++)
            {
                char c = text[i];
                
                if (escaped)
                {
                    escaped = false;
                    continue;
                }
                
                if (c == '\\')
                {
                    escaped = true;
                    continue;
                }
                
                if (c == '"')
                {
                    inQuote = !inQuote;
                    continue;
                }
                
                if (c == ':' && !inQuote)
                {
                    return i;
                }
            }
            
            return -1;
        }
        
        /// <summary>
        /// JSON文字列のキーと値のペアを分割
        /// </summary>
        private static string[] SplitJsonPairs(string json)
        {
            List<string> results = new List<string>();
            StringBuilder current = new StringBuilder();
            bool inQuote = false;
            bool escaped = false;
            
            for (int i = 0; i < json.Length; i++)
            {
                char c = json[i];
                
                if (escaped)
                {
                    current.Append(c);
                    escaped = false;
                    continue;
                }
                
                if (c == '\\')
                {
                    current.Append(c);
                    escaped = true;
                    continue;
                }
                
                if (c == '"')
                {
                    inQuote = !inQuote;
                    current.Append(c);
                    continue;
                }
                
                if (c == ',' && !inQuote)
                {
                    results.Add(current.ToString().Trim());
                    current.Clear();
                    continue;
                }
                
                current.Append(c);
            }
            
            if (current.Length > 0)
            {
                results.Add(current.ToString().Trim());
            }
            
            return results.ToArray();
        }
        
        /// <summary>
        /// JSON文字列のエスケープ
        /// </summary>
        private static string EscapeJsonString(string text)
        {
            if (string.IsNullOrEmpty(text)) return "";
            
            return text
                .Replace("\\", "\\\\")
                .Replace("\"", "\\\"")
                .Replace("\n", "\\n")
                .Replace("\r", "\\r")
                .Replace("\t", "\\t");
        }
        
        /// <summary>
        /// JSON文字列のアンエスケープ
        /// </summary>
        private static string UnescapeJsonString(string text)
        {
            if (string.IsNullOrEmpty(text)) return "";
            
            StringBuilder result = new StringBuilder();
            bool escaped = false;
            
            for (int i = 0; i < text.Length; i++)
            {
                char c = text[i];
                
                if (escaped)
                {
                    switch (c)
                    {
                        case 'n': result.Append('\n'); break;
                        case 'r': result.Append('\r'); break;
                        case 't': result.Append('\t'); break;
                        case '\\': result.Append('\\'); break;
                        case '"': result.Append('"'); break;
                        default: result.Append(c); break;
                    }
                    escaped = false;
                }
                else if (c == '\\')
                {
                    escaped = true;
                }
                else
                {
                    result.Append(c);
                }
            }
            
            return result.ToString();
        }
        
        /// <summary>
        /// エラーログを出力
        /// </summary>
        private static void LogError(string message)
        {
            Console.WriteLine($"[ERROR] {DateTime.Now:yyyy-MM-dd HH:mm:ss} - {message}");
            System.Diagnostics.Debug.WriteLine($"SimplePngMetadataManager: {message}");
        }
    }
}

using System.Drawing.Imaging;
using System.Text;
using System.Text.Json;

namespace VSA_launcher
{
    /// <summary>
    /// Hjg.Pngcsを使用せずにSystem.Drawingだけでシンプルにメタデータを管理するクラス
    /// </summary>
    public static class SimplePngMetadataManager
    {
        // 処理済みマーカーキー
        private const string PROCESSED_KEY = "VSACheck";
        
        // メタデータ格納用のExifタグID
        private const int PropertyTagExifUserComment = 0x9286; // Exifコメントタグ
        private const int PropertyTagImageDescription = 0x010E; // 画像説明
        
        /// <summary>
        /// PNGファイルにメタデータを追加
        /// </summary>
        public static bool AddMetadataToPng(string sourceFilePath, string targetFilePath, Dictionary<string, string> metadata)
        {
            // 一時ファイルパスを生成（ソースファイルと同じディレクトリに作成）
            string tempFilePath = Path.Combine(
                Path.GetDirectoryName(sourceFilePath) ?? string.Empty, 
                $"vsa_tmp_{Guid.NewGuid()}.png");
            
            try
            {
                // ファイルチェック
                if (!File.Exists(sourceFilePath))
                {
                    LogError($"元ファイルが見つかりません: {sourceFilePath}");
                    return false;
                }
                
                if (metadata == null || metadata.Count == 0)
                {
                    LogError("追加するメタデータがありません");
                    return false;
                }
                
                // 処理済みマーカーを追加
                if (!metadata.ContainsKey(PROCESSED_KEY))
                {
                    metadata.Add(PROCESSED_KEY, "true");
                }
                
                // 画像を読み込み
                using (Image image = Image.FromFile(sourceFilePath))
                {
                    // メタデータを埋め込む
                    AddMetadataToImage(image, metadata);
                    
                    // 一時ファイルとして保存
                    image.Save(tempFilePath, ImageFormat.Png);
                }
                
                // 一時ファイルを出力先にコピー
                try
                {
                    // 出力先ディレクトリの確認
                    string dir = Path.GetDirectoryName(targetFilePath) ?? string.Empty;
                    if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
                    {
                        Directory.CreateDirectory(dir);
                    }
                    
                    // ファイルをコピー（同一ファイルの場合は置き換え）
                    if (File.Exists(targetFilePath))
                    {
                        File.Delete(targetFilePath);
                    }
                    File.Copy(tempFilePath, targetFilePath);
                    
                    // 一時ファイル削除
                    try { File.Delete(tempFilePath); } catch { }
                    
                    return true;
                }
                catch (Exception ex)
                {
                    LogError($"出力先へのコピーエラー: {ex.Message}");
                    return false;
                }
            }
            catch (Exception ex)
            {
                LogError($"PNGメタデータ追加エラー: {ex.Message}");
                
                // 一時ファイルのクリーンアップ
                try
                {
                    if (File.Exists(tempFilePath))
                    {
                        File.Delete(tempFilePath);
                    }
                }
                catch { }
                
                return false;
            }
        }
        
        /// <summary>
        /// 画像にメタデータを追加
        /// </summary>
        private static void AddMetadataToImage(Image image, Dictionary<string, string> metadata)
        {
            try
            {
                // 1. 全メタデータをJSON形式で保存
                string jsonData = DictionaryToJson(metadata);
                SetPropertyItem(image, PropertyTagExifUserComment, jsonData);
                
                // 2. Windowsフォトビューアで表示用のメタデータを設定
                // メタデータのサマリーを画像説明として設定
                StringBuilder descBuilder = new StringBuilder();
                descBuilder.AppendLine("VRChat Snap Archive Info:");
                
                if (metadata.ContainsKey("WorldName"))
                    descBuilder.AppendLine($"World: {metadata["WorldName"]}");
                if (metadata.ContainsKey("WorldID"))
                    descBuilder.AppendLine($"ID: {metadata["WorldID"]}");
                if (metadata.ContainsKey("Username"))
                    descBuilder.AppendLine($"User: {metadata["Username"]}");
                if (metadata.ContainsKey("CaptureTime"))
                    descBuilder.AppendLine($"Time: {metadata["CaptureTime"]}");
                if (metadata.ContainsKey("Friends") && !string.IsNullOrEmpty(metadata["Friends"]))
                    descBuilder.AppendLine($"Friends: {metadata["Friends"]}");
                
                SetPropertyItem(image, PropertyTagImageDescription, descBuilder.ToString());
            }
            catch (Exception ex)
            {
                LogError($"メタデータ追加エラー: {ex.Message}");
            }
        }
        
        /// <summary>
        /// PropertyItemを設定するヘルパーメソッド
        /// </summary>
        private static void SetPropertyItem(Image image, int id, string value)
        {
            try
            {
                // UTF-8形式でバイト配列に変換（日本語対応）
                byte[] textBytes = Encoding.UTF8.GetBytes(value + "\0"); // null終端
                
                // PropertyItemを作成
                PropertyItem propItem = CreatePropertyItem();
                propItem.Id = id;
                propItem.Type = 2; // ASCII文字列型
                propItem.Value = textBytes;
                propItem.Len = textBytes.Length;
                
                // 既存のプロパティを削除（存在する場合）
                try { image.RemovePropertyItem(id); } catch { }
                
                // 新しいプロパティを追加
                image.SetPropertyItem(propItem);
            }
            catch (Exception ex)
            {
                LogError($"プロパティ設定エラー: {ex.Message}");
            }
        }
        
        /// <summary>
        /// PropertyItemインスタンスを作成
        /// </summary>
        private static PropertyItem CreatePropertyItem()
        {
            try
            {
                // .NET Frameworkでの方法
                return (PropertyItem)Activator.CreateInstance(typeof(PropertyItem));
            }
            catch
            {
                // .NET Core/.NET以降での方法
                using (var tempBitmap = new Bitmap(1, 1))
                {
                    var propItem = tempBitmap.PropertyItems[0];
                    return propItem;
                }
            }
        }
        
        /// <summary>
        /// PNGファイルからメタデータを読み取り
        /// </summary>
        public static Dictionary<string, string> ReadMetadataFromPng(string filePath)
        {
            Dictionary<string, string> metadata = new Dictionary<string, string>();
            
            try
            {
                if (!File.Exists(filePath) || !Path.GetExtension(filePath).Equals(".png", StringComparison.OrdinalIgnoreCase))
                {
                    return metadata;
                }
                
                // 共有読み取りモードで開く
                using (FileStream fs = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite))
                using (Image image = Image.FromStream(fs, false, false))
                {
                    foreach (PropertyItem item in image.PropertyItems)
                    {
                        if (item.Id == PropertyTagExifUserComment)
                        {
                            string json = Encoding.UTF8.GetString(item.Value).TrimEnd('\0');
                            return ParseJsonMetadata(json);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                LogError($"ファイル読み取りエラー: {ex.Message}");
            }
            
            return metadata;
        }
        
        /// <summary>
        /// FileWatcherService との互換性のために追加
        /// </summary>
        public static Dictionary<string, string> ReadMetadata(string filePath)
        {
            return ReadMetadataFromPng(filePath);
        }
        
        /// <summary>
        /// PNGファイルが処理済みかどうかを確認（ファイルロック回避版）
        /// </summary>
        public static bool IsProcessedFile(string filePath)
        {
            if (!File.Exists(filePath))
            {
                return false;
            }
            
            try
            {
                // 共有モードで開く
                using (var stream = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite))
                using (var image = Image.FromStream(stream, false, false))
                {
                    // Exifコメントからメタデータを取得
                    foreach (PropertyItem item in image.PropertyItems)
                    {
                        if (item.Id == PropertyTagExifUserComment)
                        {
                            string json = Encoding.UTF8.GetString(item.Value).TrimEnd('\0');
                            var metadata = ParseJsonMetadata(json);
                            return metadata.ContainsKey(PROCESSED_KEY) && metadata[PROCESSED_KEY] == "true";
                        }
                    }
                }
            }
            catch
            {
                // ファイルが開けない場合は処理済みでない
                return false;
            }
            
            return false;
        }
        
        /// <summary>
        /// 既存のPNGファイルにメタデータを書き込む
        /// </summary>
        public static bool WriteMetadata(string filePath, Dictionary<string, string> metadata)
        {
            if (!File.Exists(filePath))
            {
                LogError($"ファイルが存在しません: {filePath}");
                return false;
            }
            
            if (!Path.GetExtension(filePath).Equals(".png", StringComparison.OrdinalIgnoreCase))
            {
                LogError($"PNGファイルではありません: {filePath}");
                return false;
            }
            
            var existingMetadata = ReadMetadataFromPng(filePath);
            
            // 既存データと新データをマージ
            foreach (var item in metadata)
            {
                existingMetadata[item.Key] = item.Value;
            }
            
            return AddMetadataToPng(filePath, filePath, existingMetadata);
        }
        
        /// <summary>
        /// VRChatログから取得したメタデータをPNGファイルに追加
        /// </summary>
        public static bool AddVRChatMetadataToPng(string sourceFilePath, string targetFilePath, 
            VRChatLogParser? logParser = null, Dictionary<string, string>? additionalMetadata = null)
        {
            try
            {
                // ログパーサーがあればメタデータを取得
                if (logParser != null)
                {
                    var metadata = new Dictionary<string, string>
                    {
                        { "VSACheck", "true" },
                        { "WorldName", logParser.CurrentWorldName ?? "Unknown" },
                        { "WorldID", logParser.CurrentWorldId ?? "Unknown" },
                        // 撮影者情報を明示的に追加
                        { "Username", logParser.Username ?? "Unknown User" },
                        { "CaptureTime", DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") },
                        { "Friends", logParser.GetFriendsString() }
                    };
                    
                    // 追加メタデータがあれば合併
                    if (additionalMetadata != null && additionalMetadata.Count > 0)
                    {
                        foreach (var item in additionalMetadata)
                        {
                            metadata[item.Key] = item.Value;
                        }
                    }
                    
                    return AddMetadataToPng(sourceFilePath, targetFilePath, metadata);
                }
                return false;
            }
            catch (Exception ex)
            {
                LogError($"VRChatメタデータ追加エラー: {ex.Message}");
                return false;
            }
        }
        
        /// <summary>
        /// 既存のPNGファイルにVRChatログから取得したメタデータを書き込む
        /// </summary>
        public static bool WriteVRChatMetadata(string filePath, 
            VRChatLogParser? logParser = null, Dictionary<string, string>? additionalMetadata = null)
        {
            return AddVRChatMetadataToPng(filePath, filePath, logParser, additionalMetadata);
        }
        
        /// <summary>
        /// メタデータをテキストファイルにエクスポート
        /// </summary>
        public static string ExportMetadataToTextFile(string pngFilePath, string? exportPath = null)
        {
            var metadata = ReadMetadataFromPng(pngFilePath);
            if (metadata.Count == 0)
                return null;
                
            if (string.IsNullOrEmpty(exportPath))
                exportPath = Path.ChangeExtension(pngFilePath, ".metadata.txt");
                
            StringBuilder sb = new StringBuilder();
            sb.AppendLine($"=== VRC Snap Archive Metadata ===");
            sb.AppendLine($"ファイル: {Path.GetFileName(pngFilePath)}");
            sb.AppendLine($"エクスポート日時: {DateTime.Now}");
            sb.AppendLine();
            
            foreach (var item in metadata)
            {
                sb.AppendLine($"{item.Key}: {item.Value}");
            }
            
            File.WriteAllText(exportPath, sb.ToString(), Encoding.UTF8);
            return exportPath;
        }
        
        /// <summary>
        /// 辞書をJSON形式の文字列に変換（内部メソッドを公開）
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
        /// JSON文字列をパース（内部メソッドを公開）
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
            
            try
            {
                System.Diagnostics.Debug.WriteLine($"SimplePngMetadataManager: {message}");
            }
            catch { }
        }
    }
}

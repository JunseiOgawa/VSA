using System;
using System.Collections.Generic;
using System.IO;
using System.Drawing;
using System.Drawing.Imaging;
using System.Text;
using System.Text.Json;

namespace VSA_launcher
{
    /// <summary>
    /// PNGファイルのメタデータ管理を行うクラス（System.Drawing方式）
    /// </summary>
    public static class PngMetadataManager
    {
        // 処理済みマーカーキー
        private const string PROCESSED_KEY = "VSACheck";
        
        // Windows標準ビューアで確認可能なExifタグID
        private const int PropertyTagExifUserComment = 0x9286; // Exifコメントタグ
        private const int PropertyTagArtist = 0x013B; // 作者情報
        private const int PropertyTagImageDescription = 0x010E; // 画像説明
        private const int PropertyTagSoftware = 0x0131; // ソフトウェア名
        
        /// <summary>
        /// PNGファイルにメタデータを追加
        /// </summary>
        public static bool AddMetadataToPng(string sourceFilePath, string targetFilePath, Dictionary<string, string> metadata)
        {
            string tempFilePath = Path.Combine(Path.GetTempPath(), $"vsa_tmp_{Guid.NewGuid()}.png");
            bool useTempFile = string.Equals(sourceFilePath, targetFilePath, StringComparison.OrdinalIgnoreCase);
            string actualTargetPath = useTempFile ? tempFilePath : targetFilePath;
            
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
                    
                    // 出力先に保存
                    image.Save(actualTargetPath, ImageFormat.Png);
                }
                
                // 一時ファイルの場合は元に戻す
                if (useTempFile && File.Exists(tempFilePath))
                {
                    File.Copy(tempFilePath, targetFilePath, true);
                    File.Delete(tempFilePath);
                }
                
                return true;
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
                    
                    // 部分的に作成された出力ファイルを削除
                    if (!useTempFile && File.Exists(targetFilePath) && 
                        !string.Equals(sourceFilePath, targetFilePath, StringComparison.OrdinalIgnoreCase))
                    {
                        File.Delete(targetFilePath);
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
            // 1. 全メタデータをJSON形式で保存
            string jsonData = DictionaryToJson(metadata);
            SetPropertyItem(image, PropertyTagExifUserComment, jsonData);
            
            // 2. Windowsフォトビューアで表示用のメタデータを設定
            
            // ソフトウェア名
            SetPropertyItem(image, PropertyTagSoftware, "VRC-SnapArchiveKai");
            
            // 作者情報（ワールド名）
            if (metadata.ContainsKey("WorldName") && !string.IsNullOrEmpty(metadata["WorldName"]))
            {
                SetPropertyItem(image, PropertyTagArtist, metadata["WorldName"]);
            }
            
            // メタデータのサマリーを画像説明として設定
            StringBuilder descBuilder = new StringBuilder();
            descBuilder.AppendLine("VRChat Snap Archive Info:");
            
            if (metadata.ContainsKey("WorldName"))
                descBuilder.AppendLine($"World: {metadata["WorldName"]}");
            if (metadata.ContainsKey("WorldID"))
                descBuilder.AppendLine($"ID: {metadata["WorldID"]}");
            if (metadata.ContainsKey("CaptureTime"))
                descBuilder.AppendLine($"Time: {metadata["CaptureTime"]}");
            
            SetPropertyItem(image, PropertyTagImageDescription, descBuilder.ToString());
        }
        
        /// <summary>
        /// PropertyItemを設定するヘルパーメソッド
        /// </summary>
        private static void SetPropertyItem(Image image, int id, string value)
        {
            try
            {
                // 文字列をASCII形式でバイト配列に変換
                byte[] textBytes = Encoding.ASCII.GetBytes(value + "\0"); // null終端
                
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
            // .NET Frameworkとそれ以外で異なる対応
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
                    // プロパティ項目のダミーを作成して取得
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
                
                using (Image image = Image.FromFile(filePath))
                {
                    // Exifコメントからメタデータを取得
                    try
                    {
                        foreach (PropertyItem item in image.PropertyItems)
                        {
                            if (item.Id == PropertyTagExifUserComment)
                            {
                                string json = Encoding.ASCII.GetString(item.Value).TrimEnd('\0');
                                metadata = ParseJsonMetadata(json);
                                break;
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        LogError($"メタデータ読み取りエラー: {ex.Message}");
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
        /// PNGファイルが処理済みかどうかを確認
        /// </summary>
        public static bool IsProcessedFile(string filePath)
        {
            try
            {
                var metadata = ReadMetadataFromPng(filePath);
                return metadata.ContainsKey(PROCESSED_KEY) && metadata[PROCESSED_KEY].ToLower() == "true";
            }
            catch
            {
                return false;
            }
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
                bool createdNewParser = false;
                if (logParser == null)
                {
                    logParser = new VRChatLogParser(false);
                    createdNewParser = true;
                    logParser.ParseLatestLog();
                }
                
                var metadata = logParser.GenerateMetadata();
                
                if (additionalMetadata != null && additionalMetadata.Count > 0)
                {
                    foreach (var item in additionalMetadata)
                    {
                        metadata[item.Key] = item.Value;
                    }
                }
                
                bool result = AddMetadataToPng(sourceFilePath, targetFilePath, metadata);
                
                if (createdNewParser && logParser is IDisposable disposable)
                {
                    disposable.Dispose();
                }
                
                return result;
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
        /// メタデータビューアを表示
        /// </summary>
        public static void ShowMetadataViewer(string filePath)
        {
            var metadata = ReadMetadataFromPng(filePath);
            var form = new MetadataViewerForm(filePath, metadata);
            form.ShowDialog();
        }
        
        /// <summary>
        /// メタデータをテキストファイルにエクスポート
        /// </summary>
        public static string ExportMetadataToTextFile(string pngFilePath, string exportPath = null)
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
        /// 辞書をJSON形式の文字列に変換
        /// </summary>
        private static string DictionaryToJson(Dictionary<string, string> dict)
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
        private static Dictionary<string, string> ParseJsonMetadata(string json)
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
                System.Diagnostics.Debug.WriteLine($"PngMetadataManager: {message}");
            }
            catch { }
        }
    }
    
    /// <summary>
    /// メタデータビューアフォーム
    /// </summary>
    public class MetadataViewerForm : System.Windows.Forms.Form
    {
        public MetadataViewerForm(string filePath, Dictionary<string, string> metadata)
        {
            InitializeComponent(filePath, metadata);
        }
        
        private void InitializeComponent(string filePath, Dictionary<string, string> metadata)
        {
            this.Text = $"PNGメタデータビューア - {Path.GetFileName(filePath)}";
            this.Size = new System.Drawing.Size(500, 400);
            this.StartPosition = System.Windows.Forms.FormStartPosition.CenterScreen;
            
            // PictureBox（画像表示用）
            var pictureBox = new System.Windows.Forms.PictureBox
            {
                SizeMode = System.Windows.Forms.PictureBoxSizeMode.Zoom,
                Dock = System.Windows.Forms.DockStyle.Top,
                Height = 200
            };
            pictureBox.Image = Image.FromFile(filePath);
            
            // ListView（メタデータ表示用）
            var listView = new System.Windows.Forms.ListView
            {
                View = System.Windows.Forms.View.Details,
                FullRowSelect = true,
                GridLines = true,
                Dock = System.Windows.Forms.DockStyle.Fill
            };
            
            listView.Columns.Add("キー", 150);
            listView.Columns.Add("値", 300);
            
            foreach (var item in metadata)
            {
                var listItem = new System.Windows.Forms.ListViewItem(item.Key);
                listItem.SubItems.Add(item.Value);
                listView.Items.Add(listItem);
            }
            
            // エクスポートボタン
            var exportButton = new System.Windows.Forms.Button
            {
                Text = "テキストファイルにエクスポート",
                Dock = System.Windows.Forms.DockStyle.Bottom,
                Height = 30
            };
            exportButton.Click += (sender, e) => 
            {
                string exportedFile = PngMetadataManager.ExportMetadataToTextFile(filePath);
                if (!string.IsNullOrEmpty(exportedFile))
                {
                    System.Windows.Forms.MessageBox.Show(
                        $"メタデータを次のファイルにエクスポートしました:\r\n{exportedFile}", 
                        "エクスポート成功", 
                        System.Windows.Forms.MessageBoxButtons.OK, 
                        System.Windows.Forms.MessageBoxIcon.Information);
                }
            };
            
            // コントロールを追加
            this.Controls.Add(listView);
            this.Controls.Add(pictureBox);
            this.Controls.Add(exportButton);
        }
    }
}
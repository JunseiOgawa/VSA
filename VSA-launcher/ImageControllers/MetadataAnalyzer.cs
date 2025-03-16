using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Drawing;
using System.Drawing.Imaging;

namespace VSA_launcher
{
    /// <summary>
    /// 画像ファイルからメタデータを解析するクラス
    /// </summary>
    public static class MetadataAnalyzer
    {
        // Exifメタデータのプロパティタグ
        private const int PropertyTagExifUserComment = 0x9286;
        private const int PropertyTagImageDescription = 0x010E;

        // メタデータのキー
        private const string PROCESSED_KEY = "VSACheck";

        /// <summary>
        /// 画像ファイルからメタデータを読み取る
        /// </summary>
        /// <param name="imagePath">画像のファイルパス</param>
        /// <returns>メタデータの辞書</returns>
        public static Dictionary<string, string> ReadMetadataFromImage(string imagePath)
        {
            // ファイル拡張子を確認
            string extension = Path.GetExtension(imagePath).ToLower();
            Dictionary<string, string> metadata = new Dictionary<string, string>();
            
            if (extension == ".png")
            {
                System.Diagnostics.Debug.WriteLine($"PNGファイルのメタデータ読み取りを開始: {Path.GetFileName(imagePath)}");
                
                // PNGのtEXtチャンクからメタデータを読み取り
                var pngMetadata = PngMetadataManager.ReadMetadataFromPng(imagePath);
                
                if (pngMetadata != null && pngMetadata.Count > 0)
                {
                    System.Diagnostics.Debug.WriteLine($"  PngMetadataManagerで{pngMetadata.Count}項目のメタデータを検出");
                    return pngMetadata;
                }
                else
                {
                    System.Diagnostics.Debug.WriteLine("  メタデータが見つかりませんでした");
                }
            }
            
            return metadata;
        }

        /// <summary>
        /// PNG以外の画像からExifメタデータを読み取り
        /// </summary>
        private static Dictionary<string, string> ReadExifMetadata(string imagePath)
        {
            Dictionary<string, string> metadata = new Dictionary<string, string>();
            
            try
            {
                if (!File.Exists(imagePath))
                {
                    return metadata;
                }
                
                // ファイル共有モードで画像を開く
                using (FileStream fs = new FileStream(imagePath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite))
                using (Image image = Image.FromStream(fs, false, false))
                {
                    // PropertyItemsを取得してメタデータを抽出
                    foreach (PropertyItem prop in image.PropertyItems)
                    {
                        if (prop.Id == PropertyTagExifUserComment)
                        {
                            // ExifユーザーコメントからJSON形式のメタデータを取得
                            string json = Encoding.UTF8.GetString(prop.Value).TrimEnd('\0');
                            var jsonMetadata = ParseJsonMetadata(json);
                            
                            foreach (var pair in jsonMetadata)
                            {
                                metadata[pair.Key] = pair.Value;
                            }
                        }
                        else if (prop.Id == PropertyTagImageDescription)
                        {
                            // 画像説明からテキスト情報を取得
                            string description = Encoding.UTF8.GetString(prop.Value).TrimEnd('\0');
                            metadata["Description"] = description;
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"メタデータ読み取りエラー: {ex.Message}");
            }
            
            return metadata;
        }

        /// <summary>
        /// JSON文字列をパースしてDictionary<string, string>に変換
        /// </summary>
        /// <param name="json">JSON文字列</param>
        /// <returns>パースしたメタデータ</returns>
        private static Dictionary<string, string> ParseJsonMetadata(string json)
        {
            Dictionary<string, string> result = new Dictionary<string, string>();
            
            try
            {
                // System.Text.Jsonを使ってパース
                return System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, string>>(json);
            }
            catch
            {
                // フォールバック：簡易的なJSONパース処理
                try
                {
                    if (json.StartsWith("{") && json.EndsWith("}"))
                    {
                        // JSON内部を解析
                        string content = json.Substring(1, json.Length - 2);
                        string[] pairs = SplitJsonPairs(content);
                        
                        foreach (string pair in pairs)
                        {
                            int colonIndex = pair.IndexOf(':');
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
        /// JSON文字列のアンエスケープ
        /// </summary>
        private static string UnescapeJsonString(string text)
        {
            if (string.IsNullOrEmpty(text)) return "";
            
            StringBuilder result = new StringBuilder();
            bool escaped = false;
            
            foreach (char c in text)
            {
                if (escaped)
                {
                    switch (c)
                    {
                        case '\\': result.Append('\\'); break;
                        case '/': result.Append('/'); break;
                        case 'b': result.Append('\b'); break;
                        case 'f': result.Append('\f'); break;
                        case 'n': result.Append('\n'); break;
                        case 'r': result.Append('\r'); break;
                        case 't': result.Append('\t'); break;
                        case 'u': 
                            // Unicode文字は単純実装では無視
                            result.Append("\\u"); 
                            break;
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
        /// ファイルが別のプロセスによって使用されているか確認
        /// </summary>
        private static bool IsFileLockedByAnotherProcess(string filePath)
        {
            try
            {
                using (FileStream fs = new FileStream(filePath, FileMode.Open, FileAccess.ReadWrite, FileShare.None))
                {
                    // ファイルを開くことができた場合、ロックされていない
                    return false;
                }
            }
            catch (IOException)
            {
                // ファイルがロックされている
                return true;
            }
            catch
            {
                // その他のエラー
                return false;
            }
        }
    }
}

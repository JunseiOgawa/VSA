using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Text;

namespace VSA_launcher
{
    /// <summary>
    /// PNGメタデータのデバッグ・検査を行うユーティリティクラス
    /// </summary>
    public static class PngMetadataDebugger
    {
        /// <summary>
        /// PNG画像のメタデータ情報をダンプ
        /// </summary>
        public static string DumpPngMetadata(string filePath)
        {
            StringBuilder sb = new StringBuilder();
            sb.AppendLine($"=== PNG解析: {Path.GetFileName(filePath)} ===");
            
            try
            {
                if (!File.Exists(filePath))
                {
                    return $"ファイルが存在しません: {filePath}";
                }
                
                using (var fs = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite))
                using (var img = Image.FromStream(fs, false, false))
                {
                    // 画像の基本情報
                    sb.AppendLine($"画像情報: {img.Width}x{img.Height}, " +
                                 $"ピクセル形式: {img.PixelFormat}, " +
                                 $"解像度: {img.HorizontalResolution}x{img.VerticalResolution}");
                    
                    // プロパティ一覧
                    sb.AppendLine("\n=== メタデータプロパティ ===");
                    
                    if (img.PropertyItems != null && img.PropertyItems.Length > 0)
                    {
                        int index = 0;
                        foreach (var prop in img.PropertyItems)
                        {
                            sb.AppendLine($"#{index++}: ID=0x{prop.Id:X4}, Type={prop.Type}, " +
                                         $"Length={prop.Len} bytes");
                            
                            // プロパティの値を文字列として表示（可能な場合）
                            if (prop.Type == 2) // ASCII文字列
                            {
                                string value = Encoding.ASCII.GetString(prop.Value).TrimEnd('\0');
                                if (value.Length > 100)
                                    sb.AppendLine($"  値: {value.Substring(0, 100)}... (全{value.Length}文字)");
                                else
                                    sb.AppendLine($"  値: {value}");
                            }
                            else if (prop.Type == 1 || prop.Type == 3) // バイト配列
                            {
                                // バイト値を16進数で表示（最初の20バイトまで）
                                int showLen = Math.Min(prop.Len, 20);
                                StringBuilder hexValue = new StringBuilder();
                                for (int i = 0; i < showLen; i++)
                                {
                                    hexValue.Append(prop.Value[i].ToString("X2") + " ");
                                }
                                sb.AppendLine($"  バイト値: {hexValue}...");
                            }
                        }
                    }
                    else
                    {
                        sb.AppendLine("メタデータプロパティが見つかりません");
                    }
                }
                
                // 解析されたメタデータを表示
                var metadata = SimplePngMetadataManager.ReadMetadataFromPng(filePath);
                if (metadata.Count > 0)
                {
                    sb.AppendLine("\n=== VSA メタデータ ===");
                    foreach (var pair in metadata)
                    {
                        sb.AppendLine($"{pair.Key}: {pair.Value}");
                    }
                }
                else
                {
                    sb.AppendLine("\n※ VSA メタデータは検出されませんでした");
                }
            }
            catch (Exception ex)
            {
                sb.AppendLine($"\n[エラー] PNG解析中に例外が発生: {ex.Message}");
                sb.AppendLine(ex.StackTrace);
            }
            
            return sb.ToString();
        }
        
        /// <summary>
        /// メタデータコピー処理のテスト
        /// </summary>
        public static bool TestMetadataCopy(string sourceFilePath, string targetFilePath)
        {
            try
            {
                Console.WriteLine($"メタデータコピーテスト: {Path.GetFileName(sourceFilePath)} -> {Path.GetFileName(targetFilePath)}");
                
                // メタデータの読み取り
                var metadata = SimplePngMetadataManager.ReadMetadataFromPng(sourceFilePath);
                Console.WriteLine($"読み取りメタデータ数: {metadata.Count}");
                
                // テスト用のメタデータを追加
                metadata["TestKey"] = "テスト値_" + DateTime.Now.ToString("HHmmss");
                metadata["TestDate"] = DateTime.Now.ToString();
                
                // 新しいファイルに書き込み
                bool success = SimplePngMetadataManager.AddMetadataToPng(sourceFilePath, targetFilePath, metadata);
                Console.WriteLine($"メタデータ書き込み結果: {(success ? "成功" : "失敗")}");
                
                if (success)
                {
                    // 書き込まれたメタデータを検証
                    var writtenMetadata = SimplePngMetadataManager.ReadMetadataFromPng(targetFilePath);
                    Console.WriteLine($"検証: 書き込まれたメタデータ数: {writtenMetadata.Count}");
                    
                    // テストキーの検証
                    if (writtenMetadata.ContainsKey("TestKey") && 
                        writtenMetadata["TestKey"] == metadata["TestKey"])
                    {
                        Console.WriteLine("検証成功: テストキーの値が一致");
                    }
                    else
                    {
                        Console.WriteLine("検証失敗: テストキーが見つからないか値が一致しません");
                        return false;
                    }
                }
                
                return success;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"テスト中のエラー: {ex.Message}");
                Console.WriteLine(ex.StackTrace);
                return false;
            }
        }
    }
}

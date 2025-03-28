using System.Text;

namespace VSA_launcher
{
    /// <summary>
    /// PNGファイルのメタデータ管理を行うクラス
    /// </summary>
    public static class PngMetadataManager
    {
        // 処理済みマーカーキー
        private const string PROCESSED_KEY = "VSACheck";
        
        // PNG形式固有の定数
        private const int PNG_HEADER_SIZE = 8; // PNGシグネチャのサイズ
        private const int IHDR_CHUNK_SIZE = 25; // IHDRチャンクのサイズ（ヘッダ+データ+CRC）
        private static readonly byte[] PNG_SIGNATURE = { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A };
        private static readonly Encoding LATIN1 = Encoding.GetEncoding("ISO-8859-1"); // PNG仕様で定められたエンコーディング
        
        /// <summary>
        /// PNGファイルにメタデータを追加（tEXtチャンクのみを使用）
        /// </summary>
        public static bool AddMetadataToPng(string sourceFilePath, string targetFilePath, Dictionary<string, string> metadata)
        {
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
                
                // PNGファイルを読み込み
                byte[] pngData = File.ReadAllBytes(sourceFilePath);
                
                // PNGシグネチャを検証
                if (!IsPngFile(pngData))
                {
                    LogError("無効なPNGファイルです");
                    return false;
                }
                
                // メタデータチャンクを作成
                List<byte[]> textChunks = new List<byte[]>();
                
                // 1. メインメタデータ（JSON形式のすべてのメタデータ）
                string jsonData = DictionaryToJson(metadata);
                textChunks.Add(CreateTextChunkData("VSA_Metadata", jsonData));
                
                // 2. 重要なメタデータは個別のチャンクにも保存（冗長化）
                // 特に重要なフィールドはUTF-8でエンコードされることを確実にするため明示的に処理
                if (metadata.TryGetValue("WorldName", out string worldName))
                {
                    // 確実にBase64エンコードされるよう明示的に処理
                    textChunks.Add(CreateTextChunkData("WorldName", worldName));
                }

                if (metadata.TryGetValue("WorldID", out string worldId))
                {
                    textChunks.Add(CreateTextChunkData("WorldID", worldId));
                }

                if (metadata.TryGetValue("User", out string user)) // 'Username'を'User'に変更
                {
                    // 確実にBase64エンコードされるよう明示的に処理
                    textChunks.Add(CreateTextChunkData("User", user));
                }

                if (metadata.TryGetValue("CaptureTime", out string captureTime))
                {
                    textChunks.Add(CreateTextChunkData("CaptureTime", captureTime));
                }

                if (metadata.TryGetValue("Usernames", out string usernames)) // 'Friends'を'Usernames'に変更
                {
                    // 確実にBase64エンコードされるよう明示的に処理
                    textChunks.Add(CreateTextChunkData("Usernames", usernames));
                }
                
                // 3. 説明文を追加
                StringBuilder description = new StringBuilder();
                description.AppendLine("VRChat Snap Archive Info:");
                
                if (metadata.ContainsKey("WorldName"))
                    description.AppendLine($"World: {metadata["WorldName"]}");
                if (metadata.ContainsKey("WorldID"))
                    description.AppendLine($"ID: {metadata["WorldID"]}");
                if (metadata.ContainsKey("Username"))
                    description.AppendLine($"User: {metadata["Username"]}"); // ↑このメタデータキーは互換性のために残しておく
                if (metadata.ContainsKey("CaptureTime"))
                    description.AppendLine($"Time: {metadata["CaptureTime"]}");
                
                textChunks.Add(CreateTextChunkData("Description", description.ToString()));
                
                // チャンクを埋め込んだ新しいPNGデータを作成
                byte[] newPngData = EmbedTextChunks(pngData, textChunks);
                
                // 出力先ディレクトリの作成
                string? dir = Path.GetDirectoryName(targetFilePath);
                if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
                {
                    Directory.CreateDirectory(dir);
                }
                
                // ファイルを保存
                File.WriteAllBytes(targetFilePath, newPngData);
                
                return true;
            }
            catch (Exception ex)
            {
                LogError($"メタデータ追加エラー: {ex.Message}");
                return false;
            }
        }
        
        /// <summary>
        /// tEXtチャンクデータを作成
        /// </summary>
        /// <param name="keyword">メタデータキー</param>
        /// <param name="text">テキスト値</param>
        /// <returns>チャンクデータ（長さ、タイプ、データ、CRCを含む）</returns>
        private static byte[] CreateTextChunkData(string keyword, string text)
        {
            // `tEXt` はASCIIエンコーディング
            byte[] chunkTypeData = Encoding.ASCII.GetBytes("tEXt");

            // keywordはLatin1エンコーディング（PNG仕様に準拠）
            byte[] keywordData = LATIN1.GetBytes(keyword);

            // 区切り用の 0（NULL）バイト
            byte[] separatorData = new byte[] { 0 };

            // 日本語テキストは常にBase64エンコードを使用
            string textToStore;
            
            // 下記の重要フィールドや非ASCII文字を含む場合は必ずBase64エンコード
            bool requiresEncoding = keyword == "WorldName" || 
                                    keyword == "User" || // 'Username'を'User'に変更
                                    keyword == "Usernames" ||
                                    keyword == "Description" ||
                                    ContainsNonAscii(text);
            
            if (requiresEncoding)
            {
                // UTF-8でエンコードしてBase64変換
                byte[] textBytes = Encoding.UTF8.GetBytes(text);
                textToStore = "BASE64:" + Convert.ToBase64String(textBytes);
                
                // デバッグ出力
                System.Diagnostics.Debug.WriteLine($"Base64エンコード: {keyword} = {text} => {textToStore}");
            }
            else
            {
                textToStore = text;
            }

            // テキストデータ（Latin1エンコーディング）
            byte[] textData = LATIN1.GetBytes(textToStore);

            // ヘッダーサイズ＝データ長（4バイト）+ チャンクタイプ（4バイト）
            int headerSize = sizeof(int) + chunkTypeData.Length;
            int footerSize = sizeof(int); // CRC（4バイト）
            int chunkDataSize = keywordData.Length + separatorData.Length + textData.Length;

            // チャンクデータ部分を生成
            byte[] chunkData = new byte[chunkDataSize];
            Array.Copy(keywordData, 0, chunkData, 0, keywordData.Length);
            Array.Copy(separatorData, 0, chunkData, keywordData.Length, separatorData.Length);
            Array.Copy(textData, 0, chunkData, keywordData.Length + separatorData.Length, textData.Length);

            // データ長（ビッグエンディアンに変換）
            byte[] lengthData = BitConverter.GetBytes(chunkDataSize);
            if (BitConverter.IsLittleEndian)
                Array.Reverse(lengthData);

            // CRCを計算
            uint crc = Crc32.Hash(0, chunkTypeData);
            crc = Crc32.Hash(crc, chunkData);
            byte[] crcData = BitConverter.GetBytes(crc);
            if (BitConverter.IsLittleEndian)
                Array.Reverse(crcData);

            // 全体のデータを確保
            byte[] data = new byte[headerSize + chunkDataSize + footerSize];

            // チャンクを組み立て
            Array.Copy(lengthData, 0, data, 0, lengthData.Length);
            Array.Copy(chunkTypeData, 0, data, lengthData.Length, chunkTypeData.Length);
            Array.Copy(chunkData, 0, data, headerSize, chunkData.Length);
            Array.Copy(crcData, 0, data, headerSize + chunkDataSize, crcData.Length);

            return data;
        }

        // 非ASCII文字が含まれているかチェック
        private static bool ContainsNonAscii(string text)
        {
            if (string.IsNullOrEmpty(text)) return false;
            
            foreach (char c in text)
            {
                // ASCII範囲外、または制御文字（改行・タブ以外）
                if (c > 0x7F || (c < 0x20 && c != 0x09 && c != 0x0A && c != 0x0D))
                {
                    return true;
                }
            }
            return false;
        }

        // Base64でエンコードされたデータかどうかを判断してデコードするメソッドを修正
        private static string DecodeTextValue(string text)
        {
            try
            {
                // Base64エンコードされたデータかチェック
                if (text != null && text.StartsWith("BASE64:"))
                {
                    string base64Data = text.Substring(7); // "BASE64:" を除去
                    
                    try
                    {
                        byte[] bytes = Convert.FromBase64String(base64Data);
                        return Encoding.UTF8.GetString(bytes);
                    }
                    catch (Exception ex)
                    {
                        // デコードエラーをログ出力
                        System.Diagnostics.Debug.WriteLine($"Base64デコードエラー: {ex.Message}");
                        return text; // デコードに失敗した場合は元の値を返す
                    }
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"テキスト処理エラー: {ex.Message}");
            }
            
            return text;
        }
        
        /// <summary>
        /// tEXtチャンクをPNGデータに埋め込む
        /// </summary>
        /// <param name="pngData">元のPNGデータ</param>
        /// <param name="textChunks">埋め込むtEXtチャンクリスト</param>
        /// <returns>チャンクが埋め込まれた新しいPNGデータ</returns>
        private static byte[] EmbedTextChunks(byte[] pngData, List<byte[]> textChunks)
        {
            // シグネチャ + IHDRチャンクのサイズ（通常33バイト）
            int insertPosition = PNG_HEADER_SIZE + IHDR_CHUNK_SIZE;
            
            // 挿入する全データサイズを計算
            int totalChunksSize = 0;
            foreach (var chunk in textChunks)
            {
                totalChunksSize += chunk.Length;
            }
            
            // 新しいデータ用の領域を確保
            byte[] newData = new byte[pngData.Length + totalChunksSize];
            
            // PNGヘッダーとIHDRチャンクをコピー
            Array.Copy(pngData, 0, newData, 0, insertPosition);
            
            // tEXtチャンクを挿入
            int currentPos = insertPosition;
            foreach (var chunk in textChunks)
            {
                Array.Copy(chunk, 0, newData, currentPos, chunk.Length);
                currentPos += chunk.Length;
            }
            
            // 残りのデータをコピー
            Array.Copy(pngData, insertPosition, newData, currentPos, pngData.Length - insertPosition);
            
            return newData;
        }
        
        /// <summary>
        /// バイト配列がPNG形式かどうかを検証
        /// </summary>
        private static bool IsPngFile(byte[] data)
        {
            if (data.Length < PNG_SIGNATURE.Length)
                return false;
                
            for (int i = 0; i < PNG_SIGNATURE.Length; i++)
            {
                if (data[i] != PNG_SIGNATURE[i])
                    return false;
            }
            
            return true;
        }

        /// <summary>
        /// PNGファイルからメタデータを読み取り
        /// </summary>
        public static Dictionary<string, string> ReadMetadataFromPng(string filePath)
        {
            Dictionary<string, string> metadata = new Dictionary<string, string>();
            
            try
            {
                if (!File.Exists(filePath) || !IsPngFileByExtension(filePath))
                {
                    return metadata;
                }
                
                // ファイルを読み込み
                byte[] pngData = File.ReadAllBytes(filePath);
                
                // PNGシグネチャを検証
                if (!IsPngFile(pngData))
                {
                    return metadata;
                }
                
                // tEXtチャンクからメタデータを抽出
                return ExtractTextChunks(pngData);
            }
            catch (Exception ex)
            {
                LogError($"メタデータ読み取りエラー: {ex.Message}");
            }
            
            return metadata;
        }

        /// <summary>
        /// ファイル拡張子がPNGかどうかをチェック
        /// </summary>
        private static bool IsPngFileByExtension(string filePath)
        {
            return Path.GetExtension(filePath).Equals(".png", StringComparison.OrdinalIgnoreCase);
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
                if (!File.Exists(filePath) || !IsPngFileByExtension(filePath))
                {
                    return false;
                }
                
                var metadata = ReadMetadataFromPng(filePath);
                return metadata.ContainsKey(PROCESSED_KEY) && metadata[PROCESSED_KEY] == "true";
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
            
            if (!IsPngFileByExtension(filePath))
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
                        { PROCESSED_KEY, "true" },
                        { "WorldName", logParser.CurrentWorldName ?? "Unknown" },
                        { "WorldID", logParser.CurrentWorldId ?? "Unknown" },
                        // 撮影者情報を明示的に追加
                        { "User", logParser.Username ?? "Unknown User" }, // 'Username'を'User'に変更
                        { "CaptureTime", DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") },
                        { "Usernames", logParser.GetFriendsString() } // 'Friends'を'Usernames'に変更
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
        /// PNGデータからtEXtチャンクのテキストを抽出
        /// </summary>
        private static Dictionary<string, string> ExtractTextChunks(byte[] pngData)
        {
            Dictionary<string, string> result = new Dictionary<string, string>();
            int textChunksFound = 0;
            
            try
            {
                System.Diagnostics.Debug.WriteLine("tEXtチャンク抽出開始");
                int position = PNG_HEADER_SIZE; // シグネチャの後からスタート
                
                // ファイル全体をスキャン
                while (position + 8 < pngData.Length) // 最低8バイト（長さ+タイプ）必要
                {
                    // チャンク長を取得（ビッグエンディアンから変換）
                    byte[] lengthBytes = new byte[4];
                    Array.Copy(pngData, position, lengthBytes, 0, 4);
                    if (BitConverter.IsLittleEndian)
                        Array.Reverse(lengthBytes);
                    int chunkLength = BitConverter.ToInt32(lengthBytes, 0);
                    
                    // チャンクタイプを取得
                    byte[] typeBytes = new byte[4];
                    Array.Copy(pngData, position + 4, typeBytes, 0, 4);
                    string chunkType = Encoding.ASCII.GetString(typeBytes);
                    
                    System.Diagnostics.Debug.WriteLine($"チャンク検出: {chunkType}, 長さ: {chunkLength}");
                    
                    // tEXtチャンクを処理
                    if (chunkType == "tEXt" && position + 8 + chunkLength <= pngData.Length)
                    {
                        textChunksFound++;
                        byte[] chunkData = new byte[chunkLength];
                        Array.Copy(pngData, position + 8, chunkData, 0, chunkLength);
                        
                        // キーワードとテキストに分割（0バイト区切り）
                        int nullPos = Array.IndexOf(chunkData, (byte)0);
                        if (nullPos > 0)
                        {
                            byte[] keywordBytes = new byte[nullPos];
                            Array.Copy(chunkData, 0, keywordBytes, 0, nullPos);
                            string keyword = LATIN1.GetString(keywordBytes);
                            
                            byte[] textBytes = new byte[chunkLength - nullPos - 1];
                            Array.Copy(chunkData, nullPos + 1, textBytes, 0, textBytes.Length);
                            string text = LATIN1.GetString(textBytes);
                            
                            // デバッグログ出力 (生データから文字列へのデコード結果確認)
                            System.Diagnostics.Debug.WriteLine($"tEXtチャンク「{keyword}」の値(未加工): {text}");
                            
                            // Base64エンコードされたデータをデコード
                            text = DecodeTextValue(text);
                            
                            // デコード後の値をログ出力
                            System.Diagnostics.Debug.WriteLine($"tEXtチャンク「{keyword}」のデコード後の値: {text}");

                            // 特別なキー "VSA_Metadata" はJSONとして解析
                            if (keyword == "VSA_Metadata")
                            {
                                var jsonMetadata = ParseJsonMetadata(text);
                                foreach (var pair in jsonMetadata)
                                {
                                    result[pair.Key] = pair.Value;
                                }
                            }
                            else
                            {
                                result[keyword] = text;
                            }
                        }
                    }
                    
                    // 次のチャンクへ
                    position += 12 + chunkLength; // 長さ(4) + タイプ(4) + データ(chunkLength) + CRC(4)
                }
                
                System.Diagnostics.Debug.WriteLine($"tEXtチャンク抽出完了: {textChunksFound}個のtEXtチャンクを検出");
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"tEXtチャンク抽出エラー: {ex.Message}");
                LogError($"tEXtチャンク抽出エラー: {ex.Message}");
            }
            
            return result;
        }


        // 有効なBase64文字列かどうかをチェック
        private static bool IsValidBase64(string base64)
        {
            // Base64文字列の正規表現パターンに一致するかチェック
            if (string.IsNullOrEmpty(base64))
                return false;
            
            // パディング文字を考慮
            int padding = 0;
            if (base64.EndsWith("==")) padding = 2;
            else if (base64.EndsWith("=")) padding = 1;
            
            // Base64文字列の長さチェック (4の倍数であるべき)
            if ((base64.Length % 4) != 0)
                return false;
            
            // Base64文字のみを含むかチェック
            for (int i = 0; i < base64.Length - padding; i++)
            {
                char c = base64[i];
                if (!(c >= 'A' && c <= 'Z') && 
                    !(c >= 'a' && c <= 'z') && 
                    !(c >= '0' && c <= '9') && 
                    c != '+' && c != '/')
                {
                    return false;
                }
            }
            
            return true;
        }
        
        /// <summary>
        /// 辞書をJSON形式の文字列に変換
        /// </summary>
        private static string DictionaryToJson(Dictionary<string, string> dict)
        {
            // SimplePngMetadataManagerのメソッドを使用
            return SimplePngMetadataManager.DictionaryToJson(dict);
        }

        /// <summary>
        /// JSON文字列をパース
        /// </summary>
        private static Dictionary<string, string> ParseJsonMetadata(string json)
        {
            // SimplePngMetadataManagerのメソッドを使用
            return SimplePngMetadataManager.ParseJsonMetadata(json);
        }
        
        /// <summary>
        /// エラーログを出力
        /// </summary>
        private static void LogError(string message)
        {
            Console.WriteLine($"[ERROR] {DateTime.Now:yyyy-MM-dd HH:mm:ss} - {message}");
            System.Diagnostics.Debug.WriteLine($"PngMetadataManager: {message}");
        }
    }
}
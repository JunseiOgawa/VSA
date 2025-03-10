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
        
        // メタデータ格納用のExifタグID（System.Drawingで使用）
        private const int PropertyTagExifUserComment = 0x9286; // Exifコメントタグ
        private const int PropertyTagImageDescription = 0x010E; // 画像説明
        
        // PNG形式固有の定数
        private const int PNG_HEADER_SIZE = 8; // PNGシグネチャのサイズ
        private const int IHDR_CHUNK_SIZE = 25; // IHDRチャンクのサイズ（ヘッダ+データ+CRC）
        private static readonly byte[] PNG_SIGNATURE = { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A };
        private static readonly Encoding LATIN1 = Encoding.GetEncoding("ISO-8859-1"); // PNG仕様で定められたエンコーディング
        
        /// <summary>
        /// PNGファイルにメタデータを追加（ネイティブtEXtチャンクを使用）
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
                
                // 2. 重要なメタデータは個別のチャンクにも保存
                if (metadata.ContainsKey("WorldName") && metadata.ContainsKey("WorldID"))
                {
                    string worldInfo = $"{metadata["WorldName"]}|{metadata["WorldID"]}";
                    textChunks.Add(CreateTextChunkData("WorldInfo", worldInfo));
                }
                
                if (metadata.ContainsKey("CaptureTime"))
                {
                    textChunks.Add(CreateTextChunkData("CaptureTime", metadata["CaptureTime"]));
                }
                
                if (metadata.ContainsKey("Friends"))
                {
                    textChunks.Add(CreateTextChunkData("Friends", metadata["Friends"]));
                }
                
                // 3. 説明文（一般的なビューアでも表示できるように）
                StringBuilder description = new StringBuilder();
                description.AppendLine("VRChat Snap Archive Info:");
                
                if (metadata.ContainsKey("WorldName"))
                    description.AppendLine($"World: {metadata["WorldName"]}");
                if (metadata.ContainsKey("WorldID"))
                    description.AppendLine($"ID: {metadata["WorldID"]}");
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
                LogError($"ネイティブメタデータ追加エラー: {ex.Message}");
                return SimplePngMetadataManager.AddMetadataToPng(sourceFilePath, targetFilePath, metadata);
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

            // テキストデータ（Latin1エンコーディング）
            byte[] textData = LATIN1.GetBytes(text);

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
                // ファイルを読み込み
                byte[] pngData = File.ReadAllBytes(filePath);
                
                // PNGシグネチャを検証
                if (!IsPngFile(pngData))
                {
                    return metadata;
                }
                
                // 独自実装でチャンクを解析
                metadata = ExtractTextChunks(pngData);
                
                // データが見つからない場合はSystem.Drawing方式でのフォールバック
                if (metadata.Count == 0)
                {
                    metadata = SimplePngMetadataManager.ReadMetadataFromPng(filePath);
                }
            }
            catch (Exception ex)
            {
                LogError($"メタデータ読み取りエラー: {ex.Message}");
                
                // エラー時はSystem.Drawing方式でのフォールバック
                try
                {
                    metadata = SimplePngMetadataManager.ReadMetadataFromPng(filePath);
                }
                catch
                {
                    // すべて失敗した場合は空の辞書を返す
                }
            }
            
            return metadata;
        }
        
        /// <summary>
        /// PNGデータからtEXtチャンクのテキストを抽出
        /// </summary>
        private static Dictionary<string, string> ExtractTextChunks(byte[] pngData)
        {
            Dictionary<string, string> result = new Dictionary<string, string>();
            
            try
            {
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
                    
                    // tEXtチャンクを処理
                    if (chunkType == "tEXt")
                    {
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
            }
            catch (Exception ex)
            {
                LogError($"tEXtチャンク抽出エラー: {ex.Message}");
            }
            
            return result;
        }

        // 残りのメソッドはSimplePngMetadataManagerの実装を使用
        
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
            return SimplePngMetadataManager.IsProcessedFile(filePath);
        }
        
        /// <summary>
        /// 既存のPNGファイルにメタデータを書き込む
        /// </summary>
        public static bool WriteMetadata(string filePath, Dictionary<string, string> metadata)
        {
            return SimplePngMetadataManager.WriteMetadata(filePath, metadata);
        }
        
        /// <summary>
        /// VRChatログから取得したメタデータをPNGファイルに追加
        /// </summary>
        public static bool AddVRChatMetadataToPng(string sourceFilePath, string targetFilePath, 
            VRChatLogParser? logParser = null, Dictionary<string, string>? additionalMetadata = null)
        {
            return SimplePngMetadataManager.AddVRChatMetadataToPng(sourceFilePath, targetFilePath, logParser, additionalMetadata);
        }
        
        /// <summary>
        /// 既存のPNGファイルにVRChatログから取得したメタデータを書き込む
        /// </summary>
        public static bool WriteVRChatMetadata(string filePath, 
            VRChatLogParser? logParser = null, Dictionary<string, string>? additionalMetadata = null)
        {
            return SimplePngMetadataManager.WriteVRChatMetadata(filePath, logParser, additionalMetadata);
        }
        
        /// <summary>
        /// メタデータをテキストファイルにエクスポート
        /// </summary>
        public static string ExportMetadataToTextFile(string pngFilePath, string? exportPath = null)
        {
            return SimplePngMetadataManager.ExportMetadataToTextFile(pngFilePath, exportPath);
        }
        
        /// <summary>
        /// 辞書をJSON形式の文字列に変換
        /// </summary>
        private static string DictionaryToJson(Dictionary<string, string> dict)
        {
            return SimplePngMetadataManager.DictionaryToJson(dict);
        }
        
        /// <summary>
        /// JSON文字列をパース
        /// </summary>
        private static Dictionary<string, string> ParseJsonMetadata(string json)
        {
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
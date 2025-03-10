using System.Diagnostics;
using System.Text.RegularExpressions;

namespace VSA_launcher
{
    /// <summary>
    /// 画像ファイルの処理・保存を担当するクラス
    /// </summary>
    public class ImageProcessor : IDisposable
    {
        private readonly AppSettings _settings;
        private readonly Action<string, string> _updateStatusAction;
        private readonly FolderStructureManager _folderManager;
        private readonly FileNameGenerator _fileNameGenerator;
        private readonly MetadataProcessor _metadataProcessor;

        public ImageProcessor(AppSettings settings, VRChatLogParser logParser, FileWatcherService fileWatcher, Action<string, string> updateStatusAction)
        {
            _settings = settings;
            _updateStatusAction = updateStatusAction;
            
            // 関連クラスの初期化
            _folderManager = new FolderStructureManager(settings);
            _fileNameGenerator = new FileNameGenerator(settings);
            _metadataProcessor = new MetadataProcessor(logParser, fileWatcher, updateStatusAction);
        }

        /// <summary>
        /// 画像ファイルを処理して保存先に転送する
        /// </summary>
        public bool ProcessImage(string sourceFilePath)
        {
            try
            {
                // 出力先が設定されていない場合はスキップ
                if (string.IsNullOrEmpty(_settings.OutputPath))
                {
                    return false;
                }

                // 既に処理済みのファイルをスキップ
                if (_metadataProcessor.IsProcessedFile(sourceFilePath))
                {
                    _updateStatusAction("スキップ", $"処理済みファイル: {Path.GetFileName(sourceFilePath)}");
                    return false;
                }

                // 出力先フォルダを決定
                string destinationFolder = _folderManager.GetDestinationFolder(sourceFilePath);
                
                // フォルダが存在しない場合は作成
                if (!Directory.Exists(destinationFolder))
                {
                    Directory.CreateDirectory(destinationFolder);
                }

                // ファイル名を決定
                string fileName = _settings.FileRenaming.Enabled 
                    ? _fileNameGenerator.GenerateFileName(sourceFilePath)
                    : Path.GetFileName(sourceFilePath);
                
                // 出力先パス
                string destinationPath = Path.Combine(destinationFolder, fileName);

                // メタデータ有無に応じた保存処理
                bool result;
                if (_settings.Metadata.Enabled)
                {
                    result = _metadataProcessor.SaveWithMetadata(sourceFilePath, destinationPath);
                }
                else
                {
                    result = _metadataProcessor.SimpleCopy(sourceFilePath, destinationPath);
                }

                if (result)
                {
                    _updateStatusAction("処理完了", $"最新: {Path.GetFileName(destinationPath)}");
                }
                
                return result;
            }
            catch (Exception ex)
            {
                // エラー処理
                Debug.WriteLine($"ファイル処理エラー: {ex}");
                _updateStatusAction("処理エラー", ex.Message);
                return false;
            }
        }

        public void Dispose()
        {
            // 必要に応じてリソース解放
        }
    }
}
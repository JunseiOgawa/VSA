using System;
using System.Collections.Generic;
using System.Text.RegularExpressions;

namespace VSA_launcher
{
    /// <summary>
    /// VRChatのログからユーザー名を検出するための専用クラス
    /// </summary>
    public class VRChatUserDetector
    {
        // ユーザー情報データモデル
        public class VRChatUserInfo
        {
            public string WorldName { get; set; } = "Unknown World";
            public string WorldId { get; set; } = string.Empty;
            public DateTime CaptureTime { get; set; } = DateTime.Now;
            public string Photographer { get; set; } = "Unknown User";
            public List<string> Friends { get; set; } = new();
            
            public string ToDelimitedString() => 
                $"{WorldName};{WorldId};{CaptureTime:yyyyMMddHHmmss};{Photographer};{string.Join(",", Friends)}";
        }

        // 正規表現パターン
        private readonly Regex _localUserPattern = new Regex(@"\[Behaviour\] Initialized PlayerAPI ""([^""]+)"" is local", RegexOptions.Compiled);
        private readonly Regex _remoteUserPattern = new Regex(@"\[Behaviour\] Initialized PlayerAPI ""([^""]+)"" is remote", RegexOptions.Compiled);
        private readonly Regex _authUserPattern = new Regex(@"User Authenticated: ([^\(]+) \(usr_[a-z0-9\-]+\)", RegexOptions.Compiled);

        // 最後に検出したローカルユーザー（自分自身）
        private string _detectedLocalUser = "Unknown User";

        /// <summary>
        /// ログコンテンツからローカルユーザー（自分自身）を検出
        /// </summary>
        public string DetectLocalUser(string logContent)
        {
            var localMatch = _localUserPattern.Match(logContent);
            if (localMatch.Success && localMatch.Groups.Count > 1)
            {
                string username = localMatch.Groups[1].Value.Trim();
                if (!string.IsNullOrEmpty(username))
                {
                    _detectedLocalUser = username;
                    return username;
                }
            }

            var authMatch = _authUserPattern.Match(logContent);
            if (authMatch.Success && authMatch.Groups.Count > 1)
            {
                string username = authMatch.Groups[1].Value.Trim();
                if (!string.IsNullOrEmpty(username))
                {
                    _detectedLocalUser = username;
                    return username;
                }
            }

            return _detectedLocalUser;
        }

        /// <summary>
        /// ログコンテンツからリモートユーザー（他プレイヤー）のリストを検出
        /// </summary>
        public List<string> DetectRemoteUsers(string logContent, DateTime instanceStartTime)
        {
            HashSet<string> remoteUsers = new HashSet<string>();
            var remoteMatches = _remoteUserPattern.Matches(logContent);
            foreach (Match match in remoteMatches)
            {
                if (match.Success && match.Groups.Count > 1)
                {
                    string username = match.Groups[1].Value.Trim();
                    if (!string.IsNullOrEmpty(username) && !IsLocalUser(username))
                    {
                        remoteUsers.Add(username);
                    }
                }
            }

            return remoteUsers.Count > 0 ? new List<string>(remoteUsers) : new List<string> { "ボッチ(だれもいません)" };
        }

        /// <summary>
        /// ユーザー情報全体を構築
        /// </summary>
        public VRChatUserInfo BuildUserInfo(string worldName, string worldId, List<string> remoteUsers)
        {
            return new VRChatUserInfo
            {
                WorldName = worldName,
                WorldId = worldId,
                CaptureTime = DateTime.Now,
                Photographer = _detectedLocalUser,
                Friends = remoteUsers
            };
        }

        /// <summary>
        /// 指定されたユーザー名が自分自身（ローカルユーザー）かどうか判定
        /// </summary>
        private bool IsLocalUser(string username)
        {
            // 大文字小文字を区別するように変更 (StringComparison.Ordinal を使用)
            return string.Equals(username.Trim(), _detectedLocalUser.Trim(), StringComparison.Ordinal);
        }
    }
}

/*
  # delivery_files から未使用の file_path カラムを削除

  ## 概要
  delivery_files テーブルに `file_path` カラムが存在するが、
  アプリケーション全体で一度も書き込み・読み込みされていない（常に空文字 ''）。
  実際のストレージパスは `storage_path` カラムが担っており、
  全ての Edge Function とクライアントコードで `storage_path` が使用されている。

  ## 変更内容
  - `delivery_files.file_path` カラムを削除

  ## 影響範囲
  - アプリケーションコード: 影響なし（参照箇所ゼロ）
  - TypeScript 型定義: 既に定義なし
  - Edge Functions: 影響なし（参照箇所ゼロ）
*/

ALTER TABLE delivery_files DROP COLUMN IF EXISTS file_path;

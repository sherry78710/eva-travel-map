export const metadata = {
  title: '旅遊收藏',
  description: 'Eva 的旅遊地點收藏',
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-TW">
      <body style={{ margin: 0, padding: 0, background: '#F2F2F7' }}>
        {children}
      </body>
    </html>
  );
}

export const metadata = {
  title: "VBOX API",
  description: "VBOX streaming platform — backend",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#0a0912", color: "#f5f2fb" }}>
        {children}
      </body>
    </html>
  );
}

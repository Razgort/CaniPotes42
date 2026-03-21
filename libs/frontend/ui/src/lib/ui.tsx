export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <header>
        <h1>CaniPotes42</h1>
      </header>
      <main>{children}</main>
    </div>
  );
}

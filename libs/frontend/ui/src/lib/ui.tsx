export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <header>
        <h1>CaniFed</h1>
      </header>
      <main>{children}</main>
    </div>
  );
}

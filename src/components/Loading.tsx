export default function Loading({ message = '가족화투를 불러오고 있습니다' }: { message?: string }) {
  return <main className="loading-page" aria-live="polite">
    <section className="loading-panel">
      <div className="loading-brand" aria-label="가족화투"><span>가족</span><b>화투</b></div>
      <div className="loading-cards" aria-hidden="true"><span>花</span><span>光</span></div>
      <p>{message}</p>
      <div className="loading-progress" aria-hidden="true"><span /></div>
    </section>
  </main>;
}

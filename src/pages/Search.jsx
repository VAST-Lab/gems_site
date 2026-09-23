export default function Search() {
  return (
    <div className="mx-auto max-w-[1240px] px-4 pb-12 pt-6">
      <section className="mb-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(255,255,255,0.1)] bg-white/5 px-3 py-1.5 text-xs uppercase tracking-wide text-[#aab2c0]">
          Advanced Search
        </div>
        <h1 className="my-4 text-[clamp(30px,3.8vw,46px)] font-extrabold leading-tight tracking-tight">
          Search Minerals
        </h1>
        <p className="m-0 max-w-[72ch] text-[15px] leading-relaxed text-[#aab2c0]">
          Narrow results by specimen details, description, locality, collection data, price range, and catalog metadata.
        </p>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.1)] bg-white/5 shadow-2xl">
        <div className="flex flex-col items-start justify-between gap-3 border-b border-[rgba(255,255,255,0.1)] bg-white/5 p-4 lg:flex-row lg:items-center">
          <h2 className="m-0 text-base font-bold">Advanced Search Form</h2>
          <div className="text-xs text-[#aab2c0]">Expand your filters to find a specific specimen faster.</div>
        </div>

        <form className="p-4 lg:p-5">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
            <div className="col-span-1 lg:col-span-2">
              <label className="mb-2 block text-[13px] font-bold text-[#e9ecf1]">Search Query</label>
              <input
                type="search"
                className="h-11 w-full rounded-xl border border-[rgba(255,255,255,0.1)] bg-white/5 px-3.5 text-sm text-[#e9ecf1] outline-none focus:border-[rgba(255,255,255,0.16)] focus:bg-white/10"
                placeholder="Search..."
              />
            </div>

            <div>
              <label className="mb-2 block text-[13px] font-bold text-[#e9ecf1]">Species</label>
              <select className="h-11 w-full rounded-xl border border-[rgba(255,255,255,0.1)] bg-white/5 px-3.5 text-sm text-[#e9ecf1] outline-none focus:border-[rgba(255,255,255,0.16)] focus:bg-white/10">
                <option value="">Select a Species</option>
                <option>Quartz</option>
                <option>Calcite</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-[13px] font-bold text-[#e9ecf1]">Locality</label>
              <input
                type="text"
                className="h-11 w-full rounded-xl border border-[rgba(255,255,255,0.1)] bg-white/5 px-3.5 text-sm text-[#e9ecf1] outline-none focus:border-[rgba(255,255,255,0.16)] focus:bg-white/10"
                placeholder="Locality"
              />
            </div>
          </div>

          <div className="my-6 h-px w-full bg-[rgba(255,255,255,0.1)]"></div>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <div className="flex w-full flex-wrap items-center gap-2.5 lg:w-auto">
              <button
                type="submit"
                className="rounded-xl bg-[#6b3a97] px-4 py-2.5 text-sm font-bold text-white transition-all hover:brightness-110"
              >
                Search
              </button>
              <button
                type="reset"
                className="rounded-xl border border-[rgba(255,255,255,0.1)] bg-transparent px-4 py-2.5 text-sm font-bold text-[#aab2c0] transition-all hover:border-[rgba(255,255,255,0.16)] hover:bg-white/5 hover:text-[#e9ecf1]"
              >
                Clear
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}

export default function OrderDisclosure() {
  return (
    <div className="mx-auto max-w-[980px] px-5 py-7 pb-14">
      <section className="rounded-2xl border border-[rgba(255,255,255,0.1)] bg-white/5 px-8 py-9 pb-10">
        <h1 className="mb-7 mt-0 text-[clamp(32px,4.4vw,54px)] font-medium leading-tight tracking-tight">Order Mineral Specimens</h1>

        <div>
          <h2 className="mb-3.5 mt-0 text-lg font-extrabold text-[#e9ecf1]">Ordering Mineral Specimens</h2>
          <p className="mb-4 max-w-[78ch] text-[15px] leading-[1.75] text-[#aab2c0]">
            To order specimens, please click the{" "}
            <a href="#" className="text-[#b87ae6] no-underline hover:underline">
              "Order Now"
            </a>{" "}
            button located on the specific specimen page. This automatically sends us an order with information on that mineral specimen and any
            contact information you have provided.{" "}
            <strong className="font-extrabold text-[#e9ecf1]">
              You'll also receive an e-mail confirmation with details on the specimen so you know we have received your message.
            </strong>
          </p>
          <p className="mb-4 max-w-[78ch] text-[15px] leading-[1.75] text-[#aab2c0]">
            For quicker ordering, please create a log in (purple button in the top right corner) so your address and contact information is
            automatically filled in.
          </p>
          <p className="mb-4 max-w-[78ch] text-[15px] leading-[1.75] text-[#aab2c0]">
            <strong className="font-extrabold text-[#e9ecf1]">
              We do not collect payment until we have located the piece and confirmed condition. Occasionally specimens are packed to go to a show and
              inaccessible for a week or two, or they might be on loan to museums or specially curated exhibits. We don't want to charge you for
              pieces until they are actually available to ship.
            </strong>
          </p>
        </div>

        <div className="my-5 h-px w-full bg-[rgba(255,255,255,0.1)]"></div>

        <section>
          <h2 className="mb-3 mt-0 text-lg font-extrabold text-[#e9ecf1]">Quick Links</h2>
          <div className="flex flex-col gap-2.5">
            <a href="#" className="w-fit text-[15px] leading-relaxed text-[#b87ae6] no-underline hover:underline">
              Payment Options
            </a>
            <a href="#" className="w-fit text-[15px] leading-relaxed text-[#b87ae6] no-underline hover:underline">
              Payment Plans
            </a>
            <a href="#" className="w-fit text-[15px] leading-relaxed text-[#b87ae6] no-underline hover:underline">
              Shipping
            </a>
            <a href="#" className="w-fit text-[15px] leading-relaxed text-[#b87ae6] no-underline hover:underline">
              Return Policy
            </a>
          </div>
        </section>
      </section>
    </div>
  );
}

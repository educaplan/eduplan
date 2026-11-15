/** Penanda untuk halaman yang desainnya belum dikirim. */
export default function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-[26px] font-extrabold text-navy-900 sm:text-[30px]">{title}</h1>
      <p className="max-w-xl text-[15px] font-medium text-muted">
        Halaman ini belum dibangun. Akan dikerjakan dari desain Figma berikutnya.
      </p>
    </div>
  );
}

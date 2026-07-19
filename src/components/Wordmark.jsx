export default function Wordmark({ size = 'md' }) {
  const fontSize = size === 'lg' ? 18 : 15
  return (
    <div className="flex items-center gap-2 select-none">
      <span className="text-cyan font-black" style={{ fontSize: fontSize + 4 }}>◈</span>
      <span
        className="font-mono font-bold tracking-[2px] text-text"
        style={{ fontSize }}
      >
        FLIGHTINSIGHT AI
      </span>
    </div>
  )
}

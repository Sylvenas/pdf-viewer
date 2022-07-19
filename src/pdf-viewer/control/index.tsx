type CallBack = (...args: any[]) => void;

export function ZoomIn({ onClick }: { onClick: CallBack }) {
  return <button onClick={onClick}>ZoomIn</button>;
}

export function Center({ onClick }: { onClick: CallBack }) {
  return <button onClick={onClick}>Center</button>;
}

export function ZoomOut({ onClick }: { onClick: CallBack }) {
  return <button onClick={onClick}>ZoomOut</button>;
}

export default function Control({
  zoomIn,
  center,
  zoomOut,
}: {
  zoomIn: CallBack;
  center: CallBack;
  zoomOut: CallBack;
}) {
  return (
    <div>
      <ZoomIn onClick={zoomIn} />
      <Center onClick={center} />
      <ZoomOut onClick={zoomOut} />
    </div>
  );
}

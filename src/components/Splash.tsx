import { CometLogo } from './icons';

export default function Splash({ hidden }: { hidden: boolean }) {
  return (
    <div className={`splash ${hidden ? 'gone' : ''}`}>
      <div className="splash-orbit">
        <div className="splash-orbit-ring" />
        <CometLogo size={104} className="splash-logo" />
      </div>
      <h1 className="splash-title">
        Tiny<span>IDE</span>
      </h1>
      <div className="splash-bar">
        <div className="splash-bar-fill" />
      </div>
      <p className="splash-tip">Загружаем Monaco… курсор-комета уже в пути 🚀</p>
    </div>
  );
}

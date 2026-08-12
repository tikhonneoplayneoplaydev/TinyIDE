import { langLogos } from './logos';
import { colorForPath } from '../editor/monacoSetup';

/**
 * Логотип языка (SVG). Если для языка нет логотипа — цветная точка.
 */
export function LangLogo({
  lang,
  path,
  size = 15,
}: {
  lang?: string;
  path?: string;
  size?: number;
}) {
  const logo = lang ? langLogos[lang] : undefined;
  if (logo) {
    return (
      <span
        className="lang-logo"
        style={{ width: size, height: size, borderRadius: Math.max(3, size * 0.22) }}
        title={lang}
        dangerouslySetInnerHTML={{ __html: logo.svg }}
      />
    );
  }
  return (
    <span
      className="file-dot"
      style={{ width: size * 0.62, height: size * 0.62, background: path ? colorForPath(path) : '#9aa7c4' }}
    />
  );
}

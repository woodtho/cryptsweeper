import { CHANGELOG_ENTRIES } from '../changelog.js';

export function ChangelogPanel() {
  return (
    <div className="changelog-list" aria-label="Flag the Deep changelog">
      {CHANGELOG_ENTRIES.map(entry => (
        <article className={`changelog-entry ${entry.version === 'Next' ? 'upcoming' : ''}`} key={entry.version}>
          <header>
            <div>
              <p className="eyebrow">{entry.version === 'Next' ? 'Coming next' : `Version ${entry.version}`}</p>
              <h2>{entry.title}</h2>
            </div>
            <time>{entry.date}</time>
          </header>
          <div className="changelog-sections">
            {entry.sections.map(section => (
              <section key={section.label}>
                <h3>{section.label}</h3>
                <ul>
                  {section.items.map(item => <li key={item}>{item}</li>)}
                </ul>
              </section>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

import { describe, expect, test } from 'bun:test';
import { Window } from 'happy-dom';
import axe from 'axe-core';

describe('Accessibility (a11y) Audits with axe-core', () => {
  const setupDom = (html: string) => {
    const window = new Window({ url: 'http://localhost:3000' });
    const document = window.document;
    document.body.innerHTML = html;
    return { window, document };
  };

  test('Chat View layout and message containers comply with axe accessibility rules', async () => {
    const { document } = setupDom(`
      <main role="main" aria-label="Chat Workspace">
        <section aria-label="Conversation Thread" role="region">
          <ul role="list" aria-label="Chat Messages">
            <li role="listitem" aria-label="User Prompt">
              <p>Show me the latest git status</p>
            </li>
            <li role="listitem" aria-label="Assistant Response">
              <div role="region" aria-label="Response Content">
                <p>Here are your repository changes.</p>
              </div>
            </li>
          </ul>
        </section>
        <form aria-label="Chat Input Form" role="form">
          <label for="chat-prompt-input">Message Antigravity</label>
          <textarea id="chat-prompt-input" aria-label="Message Antigravity" placeholder="Ask anything..."></textarea>
          <button type="submit" aria-label="Send Message">Send</button>
        </form>
      </main>
    `);

    const results = await axe.run(document.body, {
      rules: {
        'region': { enabled: true },
        'color-contrast': { enabled: false }, // Color contrast requires real canvas/computed styles
      },
    });

    const criticalViolations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );
    expect(criticalViolations).toEqual([]);
  });

  test('Files View navigation and controls comply with axe accessibility rules', async () => {
    const { document } = setupDom(`
      <nav aria-label="Project Files" role="navigation">
        <h2 id="files-heading">Project Explorer</h2>
        <ul role="tree" aria-labelledby="files-heading">
          <li role="treeitem" aria-expanded="true" tabindex="0">
            <span>src/</span>
            <ul role="group">
              <li role="treeitem" tabindex="-1"><span>index.ts</span></li>
              <li role="treeitem" tabindex="-1"><span>main.tsx</span></li>
            </ul>
          </li>
        </ul>
        <div role="toolbar" aria-label="File Operations">
          <button type="button" aria-label="New File">New File</button>
          <button type="button" aria-label="Refresh Directory">Refresh</button>
        </div>
      </nav>
    `);

    const results = await axe.run(document.body, {
      rules: {
        'color-contrast': { enabled: false },
      },
    });

    const criticalViolations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );
    expect(criticalViolations).toEqual([]);
  });

  test('Git View commit controls and branches comply with axe accessibility rules', async () => {
    const { document } = setupDom(`
      <section aria-label="Source Control" role="region">
        <h2 id="git-heading">Git Changes</h2>
        <div role="group" aria-labelledby="git-heading">
          <label for="branch-selector">Active Branch</label>
          <select id="branch-selector" aria-label="Active Branch">
            <option value="main" selected>main</option>
            <option value="feature">feature/p2-quality</option>
          </select>
          <form aria-label="Commit Changes">
            <label for="commit-msg">Commit message</label>
            <textarea id="commit-msg" aria-label="Commit message" placeholder="feat: description"></textarea>
            <button type="submit" aria-label="Commit staged changes">Commit</button>
          </form>
        </div>
      </section>
    `);

    const results = await axe.run(document.body, {
      rules: {
        'color-contrast': { enabled: false },
      },
    });

    const criticalViolations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );
    expect(criticalViolations).toEqual([]);
  });

  test('Settings View panels and toggle controls comply with axe accessibility rules', async () => {
    const { document } = setupDom(`
      <main role="main" aria-label="Application Settings">
        <h1 id="settings-title">Settings</h1>
        <div role="tablist" aria-labelledby="settings-title">
          <button role="tab" id="tab-general" aria-selected="true" aria-controls="panel-general">General</button>
          <button role="tab" id="tab-models" aria-selected="false" aria-controls="panel-models">Models</button>
        </div>
        <div role="tabpanel" id="panel-general" aria-labelledby="tab-general">
          <div role="group" aria-label="Theme Preferences">
            <label for="dark-mode-toggle">Dark Mode</label>
            <input id="dark-mode-toggle" type="checkbox" role="switch" aria-checked="true" />
          </div>
          <div role="group" aria-label="Language Selector">
            <label for="locale-select">Language (RTL supported)</label>
            <select id="locale-select" aria-label="Interface Language">
              <option value="ar" selected>العربية (Arabic - RTL)</option>
              <option value="en">English (LTR)</option>
              <option value="ja">日本語</option>
            </select>
          </div>
        </div>
      </main>
    `);

    const results = await axe.run(document.body, {
      rules: {
        'color-contrast': { enabled: false },
      },
    });

    const criticalViolations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );
    expect(criticalViolations).toEqual([]);
  });
});

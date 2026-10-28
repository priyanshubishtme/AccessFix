import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js';
import { DiffEditor, loader } from '@monaco-editor/react';
import 'monaco-editor/esm/vs/languages/definitions/html/register.js';
import 'monaco-editor/esm/vs/language/html/monaco.contribution.js';
// The API entry leaves this service contribution out; DiffEditor breadcrumbs
// request it during startup even when the breadcrumb UI is not shown.
import 'monaco-editor/esm/vs/editor/contrib/documentSymbols/browser/outlineModel.js';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker.js?worker';
import htmlWorker from 'monaco-editor/esm/vs/languages/features/html/html.worker.js?worker';
import { useEffect, useState } from 'react';
import { getSource } from '@/lib/api.js';

globalThis.MonacoEnvironment = {
  getWorker(_moduleId, label) {
    return label === 'html' ? new htmlWorker() : new editorWorker();
  },
};
loader.config({ monaco });

/**
 * Original versus patched source. Loaded only after the person asks to see it.
 * @param {{ scanId: string, patchedHtml: string | null }} props
 */
export function CodePane({ scanId, patchedHtml }) {
  const [source, setSource] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const ctrl = new AbortController();
    getSource(scanId, ctrl.signal)
      .then((text) => {
        setSource(text);
        setError('');
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return;
        setError(err.message || 'The original source is not available.');
      });
    return () => ctrl.abort();
  }, [scanId]);

  if (error) {
    return (
      <p role="alert" className="mt-3 text-sm text-critical">
        {error}
      </p>
    );
  }

  return (
    <div className="mt-3 overflow-hidden rounded-md border">
      <p className="border-b px-3 py-2 text-xs text-muted-foreground">
        Original on the left. Patched copy on the right. The text diff on each fix stays available.
      </p>
      <DiffEditor
        height="360px"
        language="html"
        original={source}
        modified={patchedHtml || '<!-- Apply verified fixes to see the patched source. -->'}
        options={{
          readOnly: true,
          renderSideBySide: true,
          minimap: { enabled: false },
          wordWrap: 'on',
        }}
      />
    </div>
  );
}

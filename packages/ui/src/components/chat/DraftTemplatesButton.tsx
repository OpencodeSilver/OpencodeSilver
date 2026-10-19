import React from 'react';

import { Icon } from '@/components/icon/Icon';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useI18n } from '@/lib/i18n';
import { useSnippetsStore } from '@/stores/useSnippetsStore';
import { useInputStore } from '@/sync/input-store';

/**
 * "Templates" pill under the empty-draft title: lists the user's snippets and
 * drops the picked one into the composer. Hidden while there are none.
 */
export const DraftTemplatesButton: React.FC = () => {
    const { t } = useI18n();
    const snippets = useSnippetsStore((state) => state.snippets);
    const loadSnippets = useSnippetsStore((state) => state.loadSnippets);

    React.useEffect(() => {
        void loadSnippets();
    }, [loadSnippets]);

    if (snippets.length === 0) {
        return null;
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1.5 typography-meta text-muted-foreground transition-colors hover:bg-interactive-hover hover:text-foreground">
                <Icon name="file-copy" className="size-3.5" />
                {t('chat.draftTemplates.button')}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="max-h-72 min-w-56 overflow-y-auto">
                <DropdownMenuLabel>{t('chat.draftTemplates.heading')}</DropdownMenuLabel>
                {snippets.map((snippet) => (
                    <DropdownMenuItem
                        key={`${snippet.source}:${snippet.name}`}
                        onClick={() => useInputStore.getState().setPendingInputText(snippet.content, 'replace', null)}
                    >
                        <span className="truncate">{snippet.name}</span>
                        {snippet.description ? (
                            <span className="ml-2 truncate typography-micro text-muted-foreground">{snippet.description}</span>
                        ) : null}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

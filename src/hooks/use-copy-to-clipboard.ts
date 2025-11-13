"use client";

import { useState } from "react";

export function useCopyToClipboard({
  timeout = 2000,
  onCopy,
  onError,
}: {
  timeout?: number;
  onCopy?: () => void;
  onError?: () => void;
} = {}) {
  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = (value: string): void => {
    if (!navigator?.clipboard?.writeText) {
      if (onError) {
        onError();
      }
      return;
    }

    if (!value) {
      if (onError) {
        onError();
      }
      return;
    }

    navigator.clipboard
      .writeText(value)
      .then((): void => {
        setIsCopied(true);

        if (onCopy) {
          onCopy();
        }

        setTimeout((): void => {
          setIsCopied(false);
        }, timeout);
      })
      .catch((): void => {
        if (onError) {
          onError();
        }
      });
  };

  return { isCopied, copyToClipboard };
}

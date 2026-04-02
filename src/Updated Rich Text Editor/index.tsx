"use client";

// import classNames from "classnames";
import { DropdownMenu, Popover, Tabs } from "radix-ui";
import React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import * as Select from "@radix-ui/react-select";
import { RiArrowDropDownLine } from "react-icons/ri";
// import { useGlobalState } from "@/context/store/stores";
import type { MentionDataItem, MentionTab } from "./types/novelist";
import { AvatarNew } from "./common/avatar-new";
// import { PromptEvent, useRunOn } from "../prompt-input/helpers";
import {
  ALIGNMENT_BUTTONS,
  BULLET_POINT_CATEGORIES,
  DEFAULT_FONT,
  DEFAULT_FONT_SIZE,
  DEFAULT_ORDERED_LIST_STYLE,
  DEFAULT_UNORDERED_LIST_STYLE,
  FONT_SIZES,
  FONTS,
  FORMAT_BUTTONS,
  LIST_BUTTONS,
  ORDERED_LIST_STYLES,
  QUOTATION_MARK_CATEGORIES,
  UNORDERED_LIST_STYLES,
} from "./editor-config";
import * as S from "./styled";

interface RichTextEditorProps {
  placeholder: string;
  value?: string;
  mentionTabs?: MentionTab[];
  onChange: (value: string) => void;
  onClear?: () => void;
}

interface Position {
  top: number;
  left: number;
}

type ActiveStyles = Record<string, boolean>;

export const RichTextEditor = ({
  placeholder = "",
  value,
  mentionTabs = [],
  onChange,
  // onClear,
}: RichTextEditorProps) => {
  // const accent = useGlobalState("accent");
  // const theme = useGlobalState("theme");

  const [mentionItems, setMentionItems] = useState<MentionDataItem[]>([]);
  const [isMentionLoading, setIsMentionLoading] = useState(false);

  const [currentFont, setCurrentFont] = useState<string>(DEFAULT_FONT);
  const [currentFontSize, setCurrentFontSize] =
    useState<string>(DEFAULT_FONT_SIZE);
  const [activeStyles, setActiveStyles] = useState<ActiveStyles>({});
  const [activeLists, setActiveLists] = useState<ActiveStyles>({});
  const [currentUnorderedListStyle, setCurrentUnorderedListStyle] =
    useState<string>(DEFAULT_UNORDERED_LIST_STYLE);
  const [currentOrderedListStyle, setCurrentOrderedListStyle] =
    useState<string>(DEFAULT_ORDERED_LIST_STYLE);
  const [activeAlign, setActiveAlign] = useState<
    "left" | "center" | "right" | "justify"
  >("left");

  const currentUnorderedSymbolLabel =
    UNORDERED_LIST_STYLES.find((s) => s.value === currentUnorderedListStyle)
      ?.label || "•";
  const currentOrderedSymbolLabel =
    ORDERED_LIST_STYLES.find((s) => s.value === currentOrderedListStyle)
      ?.label || "1";

  const [showMentionPopover, setShowMentionPopover] = useState<boolean>(false);
  const [mentionSearch, setMentionSearch] = useState<string>("");
  const [mentionPosition, setMentionPosition] = useState<Position>({
    left: 0,
    top: 0,
  });
  const [selectedTab, setSelectedTab] = useState<string>(
    mentionTabs[0]?.id || "users",
  );
  const [focusedItemIndex, setFocusedItemIndex] = useState<number>(0);

  const editorRef = useRef<HTMLDivElement | null>(null);
  const savedSelectionRef = useRef<Range | null>(null);
  const isApplyingTextStyleRef = useRef(false);
  /** Toolbar choice — not cleared on caret moves; DOM wins when caret is inside marked-up text. */
  const preferredFontRef = useRef<string>(DEFAULT_FONT);
  const preferredFontSizeRef = useRef<string>(DEFAULT_FONT_SIZE);
  const unorderedListStyleRef = useRef<string>(DEFAULT_UNORDERED_LIST_STYLE);
  const orderedListStyleRef = useRef<string>(DEFAULT_ORDERED_LIST_STYLE);

  useEffect(() => {
    unorderedListStyleRef.current = currentUnorderedListStyle;
  }, [currentUnorderedListStyle]);

  useEffect(() => {
    orderedListStyleRef.current = currentOrderedListStyle;
  }, [currentOrderedListStyle]);

  // expose a clear function
  // const clearEditor = useCallback(() => {
  //   if (editorRef.current) {
  //     editorRef.current.innerHTML = "";
  //     onChange("");
  //   }
  //   onClear?.();
  // }, [onChange, onClear]);

  // useRunOn([PromptEvent.Sent], clearEditor); // optional: auto clear on send

  // Initialize the editor content on first render
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    // Only set initial content if editor is empty
    if (!editor.innerHTML || editor.innerHTML === "<br>") {
      editor.innerHTML = value || ""; // set value if available
    }
  }, [value]);

  useEffect(() => {
    if (!showMentionPopover) return;

    const tab = mentionTabs.find((t) => t.id === selectedTab);
    if (!tab) return;

    let cancelled = false;

    const timeout = setTimeout(async () => {
      setIsMentionLoading(true);

      try {
        const items = await tab.getData(mentionSearch);
        if (!cancelled) {
          setMentionItems(items);
          setFocusedItemIndex(0);
        }
      } finally {
        if (!cancelled) setIsMentionLoading(false);
      }
    }, 250); // debounce

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [mentionSearch, selectedTab, showMentionPopover, mentionTabs]);

  useEffect(() => {
    if (!showMentionPopover) {
      setMentionItems([]);
      setMentionSearch("");
    }
  }, [showMentionPopover]);

  const getFontAtSelection = useCallback((): string | null => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      let element: Node | null = selection.anchorNode;
      while (element && element !== editorRef.current) {
        if (element.nodeType === Node.ELEMENT_NODE) {
          const computedFont = window.getComputedStyle(
            element as Element,
          ).fontFamily;
          if (computedFont) {
            const cleanFont = computedFont
              .split(",")[0]
              .replace(/['"]/g, "")
              .trim();
            if (FONTS.includes(cleanFont)) return cleanFont;
          }
        }
        element = element.parentNode;
      }
    }
    return null;
  }, []);

  const getFontSizeAtSelection = useCallback((): string | null => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      let element: Node | null = selection.anchorNode;
      while (element && element !== editorRef.current) {
        if (element.nodeType === Node.ELEMENT_NODE) {
          const inlineSize = (element as HTMLElement).style.fontSize?.trim();
          if (
            inlineSize &&
            FONT_SIZES.some((size) => size.value === inlineSize)
          ) {
            return inlineSize;
          }
        }
        element = element.parentNode;
      }
    }
    return null;
  }, []);

  const isSelectionInsideEditor = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount || !editorRef.current) {
      return false;
    }

    return editorRef.current.contains(selection.anchorNode);
  }, []);

  const saveSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      savedSelectionRef.current = selection.getRangeAt(0).cloneRange();
    }
  }, []);

  const restoreSelection = useCallback(() => {
    if (savedSelectionRef.current) {
      const selection = window.getSelection();
      if (!selection) return;
      selection.removeAllRanges();
      selection.addRange(savedSelectionRef.current);
    }
  }, []);

  /** Return focus + selection to the editor after Font / Font size Radix Select closes. */
  const refocusEditor = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus({ preventScroll: true });
    restoreSelection();
    saveSelection();
  }, [restoreSelection, saveSelection]);

  const getAlignmentFromSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      let element: Node | null = selection.anchorNode;
      while (element && element !== editorRef.current) {
        if (element.nodeType === Node.ELEMENT_NODE) {
          const style = window.getComputedStyle(element as Element);
          return (
            (style.textAlign as "left" | "center" | "right" | "justify") ||
            "left"
          );
        }
        element = element.parentNode;
      }
    }
    // Fallback: when editor is empty, the caret's anchorNode is often the editor
    // container itself. In that case, the loop above never ran, so we must read
    // alignment from the editor element (it may be inherited, e.g. from `#root`).
    if (editorRef.current) {
      const style = window.getComputedStyle(editorRef.current);
      const raw = style.textAlign;

      if (raw === "left" || raw === "center" || raw === "right" || raw === "justify") {
        return raw;
      }

      // Handle cases like "start"/"end" (logical alignment).
      if (raw === "start" || raw === "end") {
        const dir = style.direction;
        if (raw === "start") return dir === "rtl" ? "right" : "left";
        return dir === "rtl" ? "left" : "right";
      }
    }
    return "left";
  }, []);

  const getClosestListElement = useCallback(
    (listTag?: "UL" | "OL"): HTMLUListElement | HTMLOListElement | null => {
      const selection = window.getSelection();
      if (!selection || !selection.rangeCount) return null;

      let element: Node | null = selection.anchorNode;
      while (element && element !== editorRef.current) {
        if (element.nodeType === Node.ELEMENT_NODE) {
          const el = element as HTMLElement;
          if (el.tagName === "UL" || el.tagName === "OL") {
            if (!listTag || el.tagName === listTag) {
              return el as HTMLUListElement | HTMLOListElement;
            }
          }
        }
        element = element.parentNode;
      }

      return null;
    },
    [],
  );

  const getListStyleAtSelection = useCallback(
    (listTag: "UL" | "OL", allowedStyles: string[]): string | null => {
      const list = getClosestListElement(listTag);
      if (!list) return null;

      const inlineStyle = list.style.listStyleType?.trim();
      if (inlineStyle && allowedStyles.includes(inlineStyle)) {
        return inlineStyle;
      }

      const computedStyle = window.getComputedStyle(list).listStyleType;
      if (computedStyle && allowedStyles.includes(computedStyle)) {
        return computedStyle;
      }

      return null;
    },
    [getClosestListElement],
  );

  const updateActiveStyles = useCallback(() => {
    const selection = window.getSelection();
    const isCollapsed = selection?.isCollapsed ?? true;
    const insideEditor = isSelectionInsideEditor();

    const styles: ActiveStyles = {};
    FORMAT_BUTTONS.forEach((btn) => {
      styles[btn.id] = document.queryCommandState(btn.command);
    });

    const listStyles: ActiveStyles = {};
    LIST_BUTTONS.forEach((btn) => {
      listStyles[btn.id] = document.queryCommandState(btn.command);
    });

    const selectedFont = getFontAtSelection();
    const selectedFontSize = getFontSizeAtSelection();
    const selectedUnorderedStyle = getListStyleAtSelection(
      "UL",
      UNORDERED_LIST_STYLES.map((item) => item.value),
    );
    const selectedOrderedStyle = getListStyleAtSelection(
      "OL",
      ORDERED_LIST_STYLES.map((item) => item.value),
    );
    setActiveStyles(styles);
    setActiveLists(listStyles);
    setActiveAlign(getAlignmentFromSelection());

    setCurrentFont(() => {
      if (selectedFont) return selectedFont;
      return preferredFontRef.current;
    });

    setCurrentFontSize(() => {
      if (selectedFontSize) return selectedFontSize;
      return preferredFontSizeRef.current;
    });

    setCurrentUnorderedListStyle((prev) => {
      if (selectedUnorderedStyle) return selectedUnorderedStyle;
      if (isCollapsed && insideEditor) return prev;
      return DEFAULT_UNORDERED_LIST_STYLE;
    });

    setCurrentOrderedListStyle((prev) => {
      if (selectedOrderedStyle) return selectedOrderedStyle;
      if (isCollapsed && insideEditor) return prev;
      return DEFAULT_ORDERED_LIST_STYLE;
    });
  }, [
    getAlignmentFromSelection,
    getFontAtSelection,
    getFontSizeAtSelection,
    getListStyleAtSelection,
    isSelectionInsideEditor,
  ]);

  const execCommand = useCallback(
    (command: string) => {
      editorRef.current?.focus();
      restoreSelection();
      document.execCommand(command, false);
      updateActiveStyles();
    },
    [restoreSelection, updateActiveStyles],
  );

  const handleFormatClick = useCallback(
    (command: string) => {
      execCommand(command);
    },
    [execCommand],
  );

  // Alignment options
  type AlignId = "left" | "center" | "right" | "justify";

  const handleAlignClick = useCallback(
    (alignId: AlignId, command: string) => {
      editorRef.current?.focus();
      restoreSelection();
      document.execCommand(command, false);
      setActiveAlign(alignId);
    },
    [restoreSelection],
  );

  const handleFontChange = useCallback(
    (fontName: string) => {
      isApplyingTextStyleRef.current = true;
      preferredFontRef.current = fontName;
      editorRef.current?.focus();

      const apply = () => {
        restoreSelection();
        const editor = editorRef.current;
        const selection = window.getSelection();
        if (!editor || !selection?.rangeCount) {
          setCurrentFont(fontName);
          refocusEditor();
          requestAnimationFrame(() => {
            isApplyingTextStyleRef.current = false;
          });
          return;
        }

        const range = selection.getRangeAt(0);
        if (!editor.contains(range.commonAncestorContainer)) {
          setCurrentFont(fontName);
          refocusEditor();
          requestAnimationFrame(() => {
            isApplyingTextStyleRef.current = false;
          });
          return;
        }

        if (!range.collapsed) {
          document.execCommand("fontName", false, fontName);
        } else {
          const span = document.createElement("span");
          span.style.fontFamily = fontName;
          const zws = document.createTextNode("\u200b");
          span.appendChild(zws);
          range.insertNode(span);
          const newRange = document.createRange();
          newRange.setStart(zws, zws.length);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }

        setCurrentFont(fontName);
        saveSelection();
        editor.dispatchEvent(new Event("input", { bubbles: true }));
        requestAnimationFrame(() => {
          refocusEditor();
          requestAnimationFrame(() => {
            isApplyingTextStyleRef.current = false;
          });
        });
      };

      queueMicrotask(() => requestAnimationFrame(apply));
    },
    [refocusEditor, restoreSelection, saveSelection],
  );

  const handleFontSizeChange = useCallback(
    (fontSize: string) => {
      isApplyingTextStyleRef.current = true;
      preferredFontSizeRef.current = fontSize;
      editorRef.current?.focus();

      const apply = () => {
        restoreSelection();
        const editor = editorRef.current;
        const selection = window.getSelection();
        if (!editor || !selection?.rangeCount) {
          setCurrentFontSize(fontSize);
          refocusEditor();
          requestAnimationFrame(() => {
            isApplyingTextStyleRef.current = false;
          });
          return;
        }

        const range = selection.getRangeAt(0);
        if (!editor.contains(range.commonAncestorContainer)) {
          setCurrentFontSize(fontSize);
          refocusEditor();
          requestAnimationFrame(() => {
            isApplyingTextStyleRef.current = false;
          });
          return;
        }

        if (!range.collapsed) {
          document.execCommand("fontSize", false, "7");
          editor.querySelectorAll('font[size="7"]').forEach((node) => {
            if (!range.intersectsNode(node)) return;
            const el = node as HTMLElement;
            el.removeAttribute("size");
            el.style.fontSize = fontSize;
          });
        } else {
          const span = document.createElement("span");
          span.style.fontSize = fontSize;
          const zws = document.createTextNode("\u200b");
          span.appendChild(zws);
          range.insertNode(span);
          const newRange = document.createRange();
          newRange.setStart(zws, zws.length);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }

        setCurrentFontSize(fontSize);
        saveSelection();
        editor.dispatchEvent(new Event("input", { bubbles: true }));
        requestAnimationFrame(() => {
          refocusEditor();
          requestAnimationFrame(() => {
            isApplyingTextStyleRef.current = false;
          });
        });
      };

      queueMicrotask(() => requestAnimationFrame(apply));
    },
    [refocusEditor, restoreSelection, saveSelection],
  );

  const applyListStyleToClosest = useCallback(
    (listTag: "UL" | "OL", styleType: string) => {
      const list = getClosestListElement(listTag);
      if (!list) return;
      list.style.listStyleType = styleType;
      list.setAttribute("data-list-style-type", styleType);
    },
    [getClosestListElement],
  );

  /** Preview/chevron dropdown: updates preferred style only; applies to DOM if already in a list. */
  const handleUnorderedListPreferenceChange = useCallback(
    (styleType: string) => {
      isApplyingTextStyleRef.current = true;
      editorRef.current?.focus();
      restoreSelection();

      unorderedListStyleRef.current = styleType;
      setCurrentUnorderedListStyle(styleType);

      const inUl = getClosestListElement("UL");
      if (inUl) {
        applyListStyleToClosest("UL", styleType);
      }

      requestAnimationFrame(() => {
        saveSelection();
        updateActiveStyles();
        isApplyingTextStyleRef.current = false;
      });
    },
    [
      applyListStyleToClosest,
      getClosestListElement,
      restoreSelection,
      saveSelection,
      updateActiveStyles,
    ],
  );

  /** Main list icon: toggle list off if inside UL; otherwise insert list with current preferred style. */
  const handleUnorderedListMainIconClick = useCallback(() => {
    isApplyingTextStyleRef.current = true;
    editorRef.current?.focus();
    restoreSelection();

    const inUl = getClosestListElement("UL");
    if (inUl) {
      document.execCommand("insertUnorderedList", false);
      requestAnimationFrame(() => {
        saveSelection();
        updateActiveStyles();
        isApplyingTextStyleRef.current = false;
      });
      return;
    }

    document.execCommand("insertUnorderedList", false);
    const style = unorderedListStyleRef.current;
    requestAnimationFrame(() => {
      applyListStyleToClosest("UL", style);
      saveSelection();
      updateActiveStyles();
      isApplyingTextStyleRef.current = false;
    });
  }, [
    applyListStyleToClosest,
    getClosestListElement,
    restoreSelection,
    saveSelection,
    updateActiveStyles,
  ]);

  const handleOrderedListPreferenceChange = useCallback(
    (styleType: string) => {
      isApplyingTextStyleRef.current = true;
      editorRef.current?.focus();
      restoreSelection();

      orderedListStyleRef.current = styleType;
      setCurrentOrderedListStyle(styleType);

      const inOl = getClosestListElement("OL");
      if (inOl) {
        applyListStyleToClosest("OL", styleType);
      }

      requestAnimationFrame(() => {
        saveSelection();
        updateActiveStyles();
        isApplyingTextStyleRef.current = false;
      });
    },
    [
      applyListStyleToClosest,
      getClosestListElement,
      restoreSelection,
      saveSelection,
      updateActiveStyles,
    ],
  );

  const handleOrderedListMainIconClick = useCallback(() => {
    isApplyingTextStyleRef.current = true;
    editorRef.current?.focus();
    restoreSelection();

    const inOl = getClosestListElement("OL");
    if (inOl) {
      document.execCommand("insertOrderedList", false);
      requestAnimationFrame(() => {
        saveSelection();
        updateActiveStyles();
        isApplyingTextStyleRef.current = false;
      });
      return;
    }

    document.execCommand("insertOrderedList", false);
    const style = orderedListStyleRef.current;
    requestAnimationFrame(() => {
      applyListStyleToClosest("OL", style);
      saveSelection();
      updateActiveStyles();
      isApplyingTextStyleRef.current = false;
    });
  }, [
    applyListStyleToClosest,
    getClosestListElement,
    restoreSelection,
    saveSelection,
    updateActiveStyles,
  ]);

  const handleQuotationMarkInsert = useCallback(
    (symbol: string) => {
      editorRef.current?.focus();
      restoreSelection();
      document.execCommand("insertText", false, symbol);
      saveSelection();
    },
    [restoreSelection, saveSelection],
  );

  const checkForMention = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const textNode = range.startContainer;

    if (textNode.nodeType !== Node.TEXT_NODE) {
      setShowMentionPopover(false);
      return;
    }

    const text = textNode.textContent || "";
    const cursorPos = range.startOffset;
    const textBeforeCursor = text.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      if (!textAfterAt.includes(" ")) {
        setMentionSearch(textAfterAt);

        const tempRange = document.createRange();
        tempRange.setStart(textNode, lastAtIndex);
        tempRange.setEnd(textNode, lastAtIndex + 1);
        const rect = tempRange.getBoundingClientRect();
        const editorRect = editorRef.current?.getBoundingClientRect();
        if (editorRect) {
          setMentionPosition({
            left: rect.left - editorRect.left,
            top: rect.bottom - editorRect.top + 8,
          });
        }

        setShowMentionPopover(true);
        setFocusedItemIndex(0);
        return;
      }
    }

    setShowMentionPopover(false);
  }, []);

  const handleInput = useCallback(() => {
    saveSelection();
    checkForMention();
    updateActiveStyles();

    const editor = editorRef.current;
    if (!editor) return;

    const content = editor.innerHTML;

    // Ignore empty or trivial content
    if (!content || content.trim() === "" || content === "<br>") {
      onChange("");
      return;
    }
    onChange(content);
  }, [saveSelection, checkForMention, updateActiveStyles, onChange]);

  const isImageUrl = useCallback((url: string): boolean => {
    // Check if URL ends with image/gif extensions
    const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i;
    if (imageExtensions.test(url)) return true;

    // Check for common image hosting patterns
    const imageHostPatterns = [
      /tenor\.com\/.*\.gif/i,
      /giphy\.com\/media/i,
      /imgur\.com.*\.(jpg|jpeg|png|gif|webp)/i,
      /media\.tenor\.com/i,
      /i\.imgur\.com/i,
    ];

    return imageHostPatterns.some((pattern) => pattern.test(url));
  }, []);

  const insertImageFromUrl = useCallback(
    (url: string) => {
      const selection = window.getSelection();
      if (!selection || !selection.rangeCount) return;

      const range = selection.getRangeAt(0);

      // Create image container
      const imgContainer = document.createElement("span");
      imgContainer.className = "inline-image-container";
      imgContainer.contentEditable = "false";

      // Create image element
      const img = document.createElement("img");
      img.src = url;
      img.className = "inline-image";
      img.alt = "Pasted image";

      imgContainer.appendChild(img);

      // Insert image at cursor position
      range.deleteContents();
      range.insertNode(imgContainer);

      // Add space after image
      const spaceNode = document.createTextNode(" ");
      imgContainer.parentNode?.insertBefore(
        spaceNode,
        imgContainer.nextSibling,
      );

      // Move cursor after the image
      const newRange = document.createRange();
      newRange.setStartAfter(spaceNode);
      newRange.setEndAfter(spaceNode);
      selection.removeAllRanges();
      selection.addRange(newRange);

      saveSelection();
      handleInput();
    },
    [saveSelection, handleInput],
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>) => {
      const pastedText = e.clipboardData.getData("text/plain").trim();

      // Check if pasted text is an image URL
      if (pastedText && isImageUrl(pastedText)) {
        e.preventDefault();
        insertImageFromUrl(pastedText);
        return;
      }

      // For other content, let default paste behavior work
    },
    [isImageUrl, insertImageFromUrl],
  );

  const insertMention = useCallback(
    (item: MentionDataItem) => {
      const selection = window.getSelection();
      if (!selection || !selection.rangeCount) return;

      const range = selection.getRangeAt(0);
      const textNode = range.startContainer;

      if (textNode.nodeType !== Node.TEXT_NODE) return;

      const text = textNode.textContent ?? "";
      const cursorPos = range.startOffset;
      const textBeforeCursor = text.slice(0, cursorPos);
      const lastAtIndex = textBeforeCursor.lastIndexOf("@");

      if (lastAtIndex !== -1) {
        // Root mention container
        const mentionSpan = document.createElement("span");
        mentionSpan.className = "mention-tag";
        mentionSpan.contentEditable = "false";
        mentionSpan.dataset.type = item.type;
        mentionSpan.dataset.id = item.id;

        // Avatar
        const avatar = document.createElement("img");
        avatar.src = item.image;
        avatar.alt = item.displayName;
        avatar.className = "mention-avatar";

        // 🔥 Dynamic avatar URL based on type
        const serviceUrl =
          (import.meta as any).env?.VITE_SERVICE_URL as string | undefined;

        if (item.type === "USER") {
          avatar.src = serviceUrl
            ? `${serviceUrl}/user/${item.id}/avatar`
            : item.image;
        } else if (item.type === "ITEM") {
          avatar.src = serviceUrl
            ? `${serviceUrl}/item/${item.id}/avatar`
            : item.image;
        }

        // Text
        const textSpan = document.createElement("span");
        textSpan.className = "mention-text";
        textSpan.textContent = item.displayName;

        mentionSpan.appendChild(avatar);
        mentionSpan.appendChild(textSpan);

        const beforeText = text.slice(0, lastAtIndex);
        const afterText = text.slice(cursorPos);

        textNode.textContent = beforeText;

        const afterTextNode = document.createTextNode(" " + afterText);
        const parent = textNode.parentNode;
        if (!parent) return;

        parent.insertBefore(mentionSpan, textNode.nextSibling);
        parent.insertBefore(afterTextNode, mentionSpan.nextSibling);

        const newRange = document.createRange();
        newRange.setStart(afterTextNode, 1);
        newRange.setEnd(afterTextNode, 1);

        selection.removeAllRanges();
        selection.addRange(newRange);
      }

      setShowMentionPopover(false);
      setMentionSearch("");
      handleInput();
      editorRef.current?.focus();
    },
    [editorRef, setShowMentionPopover, setMentionSearch, handleInput],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (showMentionPopover) {
        const currentItems = mentionItems;

        switch (e.key) {
          case "ArrowDown":
            e.preventDefault();
            setFocusedItemIndex((prev) =>
              prev < currentItems.length - 1 ? prev + 1 : 0,
            );
            return;
          case "ArrowUp":
            e.preventDefault();
            setFocusedItemIndex((prev) =>
              prev > 0 ? prev - 1 : currentItems.length - 1,
            );
            return;
          case "Tab": {
            e.preventDefault();
            const currentIndex = mentionTabs.findIndex(
              (t) => t.id === selectedTab,
            );
            const nextIndex = (currentIndex + 1) % mentionTabs.length;
            setSelectedTab(mentionTabs[nextIndex].id);
            setFocusedItemIndex(0);
            return;
          }
          case "Enter":
            if (currentItems.length > 0) {
              e.preventDefault();
              insertMention(currentItems[focusedItemIndex]);
            }
            return;
          case "Escape":
            e.preventDefault();
            setShowMentionPopover(false);
            return;
        }
      }
    },
    [
      showMentionPopover,
      // getCurrentTabData,
      selectedTab,
      focusedItemIndex,
      insertMention,
    ],
  );

  const handleSelectionChange = useCallback(() => {
    if (document.activeElement !== editorRef.current) return;

    saveSelection();
    updateActiveStyles();
  }, [saveSelection, updateActiveStyles]);

  // const handleSave = useCallback(() => {
  //   const editor = editorRef.current;

  //   if (!editor) return;
  //   const content = editor.innerHTML;

  //   if (content?.trim() && content !== "<br>") {
  //     console.log(content);
  //   }
  // }, []);

  useEffect(() => {
    document.addEventListener("selectionchange", handleSelectionChange);
    return () =>
      document.removeEventListener("selectionchange", handleSelectionChange);
  }, [handleSelectionChange]);

  return (
    <S.Container>
      <S.ToolbarRoot>
        <S.ToolbarFontCluster>
          <S.FontSelectRoot>
            <Select.Root
              value={currentFont}
              onValueChange={(v) => handleFontChange(v)}
            >
              <S.SelectTrigger
                onPointerDown={(e) => {
                  e.preventDefault();
                  saveSelection();
                }}
                aria-label="Font"
              >
                <S.SelectValue />
                <S.SelectIcon aria-hidden>
                  <RiArrowDropDownLine size={20} />
                </S.SelectIcon>
              </S.SelectTrigger>

              <Select.Portal>
                <S.SelectContent
                  onCloseAutoFocus={(e) => {
                    e.preventDefault();
                    refocusEditor();
                  }}
                >
                  <S.SelectViewport>
                    {FONTS.map((f) => (
                      <S.SelectItem
                        key={f}
                        value={f}
                        style={{ fontFamily: f }}
                      >
                        <Select.ItemText>{f}</Select.ItemText>
                      </S.SelectItem>
                    ))}
                  </S.SelectViewport>
                </S.SelectContent>
              </Select.Portal>
            </Select.Root>
          </S.FontSelectRoot>

          <S.FontSelectRoot>
            <Select.Root
              value={currentFontSize}
              onValueChange={(v) => handleFontSizeChange(v)}
            >
              <S.SelectTrigger
                onPointerDown={(e) => {
                  e.preventDefault();
                  saveSelection();
                }}
                aria-label="Font size"
              >
                <S.SelectValue />
                <S.SelectIcon aria-hidden>
                  <RiArrowDropDownLine size={20} />
                </S.SelectIcon>
              </S.SelectTrigger>

              <Select.Portal>
                <S.SelectContent
                  onCloseAutoFocus={(e) => {
                    e.preventDefault();
                    refocusEditor();
                  }}
                >
                  <S.SelectViewport>
                    {FONT_SIZES.map((size) => (
                      <S.SelectItem key={size.value} value={size.value}>
                        <Select.ItemText>{size.label}</Select.ItemText>
                      </S.SelectItem>
                    ))}
                  </S.SelectViewport>
                </S.SelectContent>
              </Select.Portal>
            </Select.Root>
          </S.FontSelectRoot>
        </S.ToolbarFontCluster>

        <S.Divider />

        <S.ToggleGroup type="multiple">
          {FORMAT_BUTTONS.map((btn) => {
            const Icon = btn.icon;
            return (
              <S.ToggleItem
                key={btn.id}
                value={btn.id}
                $active={activeStyles[btn.id]}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleFormatClick(btn.command)}
                title={btn.title}
              >
                <Icon size={20} />
              </S.ToggleItem>
            );
          })}
        </S.ToggleGroup>

        <S.Divider />

        {/* Alignment before lists so flex-wrap drops lists+quotation first when width runs out */}
        <S.ToggleGroup type="single">
          {ALIGNMENT_BUTTONS.map((btn) => {
            const Icon = btn.icon;
            return (
              <S.ToggleItem
                key={btn.id}
                value={btn.id}
                $active={activeAlign === btn.id}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleAlignClick(btn.id as AlignId, btn.command)}
                title={btn.title}
              >
                <Icon size={20} />
              </S.ToggleItem>
            );
          })}
        </S.ToggleGroup>

        <S.Divider />

        <S.ToolbarListsQuotWrap>
          <S.ListToolsRow>
            {LIST_BUTTONS.map((btn) => {
              const Icon = btn.icon;

              if (btn.id === "unordered") {
                return (
                  <S.ListToolCluster key={btn.id}>
                    <S.ListMainIconButton
                      type="button"
                      $active={activeLists[btn.id]}
                      aria-label={btn.title}
                      title={btn.title}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={handleUnorderedListMainIconClick}
                    >
                      <Icon size={20} />
                    </S.ListMainIconButton>

                    <DropdownMenu.Root modal={false}>
                      <DropdownMenu.Trigger asChild>
                        <S.ListStylePreviewTrigger
                          type="button"
                          aria-label="Bullet list style"
                          title="Choose bullet style"
                          onPointerDown={() => saveSelection()}
                        >
                          <span
                            style={{ fontSize: "0.9rem", opacity: 0.9 }}
                            aria-hidden
                          >
                            {currentUnorderedSymbolLabel}
                          </span>
                          <RiArrowDropDownLine size={16} aria-hidden />
                        </S.ListStylePreviewTrigger>
                      </DropdownMenu.Trigger>

                      <DropdownMenu.Portal>
                        <S.ListDropdownContent
                          sideOffset={6}
                          align="end"
                          collisionPadding={8}
                          onCloseAutoFocus={(e) => {
                            e.preventDefault();
                            editorRef.current?.focus();
                            restoreSelection();
                          }}
                        >
                          <DropdownMenu.RadioGroup
                            value={currentUnorderedListStyle}
                            onValueChange={(v) =>
                              handleUnorderedListPreferenceChange(v)
                            }
                          >
                            {Object.entries(BULLET_POINT_CATEGORIES).map(
                              ([key, category]) => (
                                <S.BulletCategoryGroup key={key}>
                                  <S.BulletCategoryTitle>
                                    {category.name}
                                  </S.BulletCategoryTitle>
                                  <S.BulletGrid>
                                    {category.symbols.map((symbol) => (
                                      <S.BulletStyleRadioItem
                                        key={symbol.value}
                                        value={symbol.value}
                                      >
                                        {symbol.label}
                                      </S.BulletStyleRadioItem>
                                    ))}
                                  </S.BulletGrid>
                                </S.BulletCategoryGroup>
                              ),
                            )}
                          </DropdownMenu.RadioGroup>
                        </S.ListDropdownContent>
                      </DropdownMenu.Portal>
                    </DropdownMenu.Root>
                  </S.ListToolCluster>
                );
              }

              if (btn.id === "ordered") {
                return (
                  <S.ListToolCluster key={btn.id}>
                    <S.ListMainIconButton
                      type="button"
                      $active={activeLists[btn.id]}
                      aria-label={btn.title}
                      title={btn.title}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={handleOrderedListMainIconClick}
                    >
                      <Icon size={20} />
                    </S.ListMainIconButton>

                    <DropdownMenu.Root modal={false}>
                      <DropdownMenu.Trigger asChild>
                        <S.ListStylePreviewTrigger
                          type="button"
                          aria-label="Numbered list style"
                          title="Choose numbering style"
                          onPointerDown={() => saveSelection()}
                        >
                          <span
                            style={{ fontSize: "0.9rem", opacity: 0.9 }}
                            aria-hidden
                          >
                            {currentOrderedSymbolLabel}
                          </span>
                          <RiArrowDropDownLine size={16} aria-hidden />
                        </S.ListStylePreviewTrigger>
                      </DropdownMenu.Trigger>

                      <DropdownMenu.Portal>
                        <S.ListDropdownContent
                          sideOffset={6}
                          align="end"
                          collisionPadding={8}
                          onCloseAutoFocus={(e) => {
                            e.preventDefault();
                            editorRef.current?.focus();
                            restoreSelection();
                          }}
                        >
                          <DropdownMenu.RadioGroup
                            value={currentOrderedListStyle}
                            onValueChange={(v) =>
                              handleOrderedListPreferenceChange(v)
                            }
                          >
                            <S.OrderedStyleGrid>
                              {ORDERED_LIST_STYLES.map((item) => (
                                <S.OrderedStyleRadioItem
                                  key={item.value}
                                  value={item.value}
                                >
                                  {item.label}
                                </S.OrderedStyleRadioItem>
                              ))}
                            </S.OrderedStyleGrid>
                          </DropdownMenu.RadioGroup>
                        </S.ListDropdownContent>
                      </DropdownMenu.Portal>
                    </DropdownMenu.Root>
                  </S.ListToolCluster>
                );
              }

              return null;
            })}
          </S.ListToolsRow>

          <S.Divider />

          <S.ToolbarQuotWrap>
            <DropdownMenu.Root modal={false}>
              <DropdownMenu.Trigger asChild>
                <S.QuotationMenuTrigger
                  type="button"
                  aria-haspopup="menu"
                  aria-label="Insert quotation mark"
                  title="Insert Quotation Mark"
                  onPointerDown={() => saveSelection()}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <span aria-hidden>"</span>
                  <RiArrowDropDownLine size={18} aria-hidden />
                </S.QuotationMenuTrigger>
              </DropdownMenu.Trigger>

              <DropdownMenu.Portal>
                <S.QuotationDropdownContent
                  sideOffset={6}
                  align="end"
                  collisionPadding={8}
                  onCloseAutoFocus={(e) => {
                    e.preventDefault();
                    editorRef.current?.focus();
                    restoreSelection();
                  }}
                >
                  {Object.entries(QUOTATION_MARK_CATEGORIES).map(
                    ([key, category]) => (
                      <S.QuotationCategoryGroup key={key}>
                        <S.QuotationCategoryTitle>
                          {category.name}
                        </S.QuotationCategoryTitle>
                        <S.QuotationGrid>
                          {category.symbols.map((symbol) => (
                            <S.QuotationMenuItem
                              key={symbol.id}
                              title={symbol.id}
                              onSelect={() =>
                                handleQuotationMarkInsert(symbol.value || "")
                              }
                            >
                              {symbol.label}
                            </S.QuotationMenuItem>
                          ))}
                        </S.QuotationGrid>
                      </S.QuotationCategoryGroup>
                    ),
                  )}
                </S.QuotationDropdownContent>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </S.ToolbarQuotWrap>
        </S.ToolbarListsQuotWrap>
      </S.ToolbarRoot>

      <S.EditorWrapper>
        <S.EditorContent
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          data-placeholder={placeholder}
        />

        <Popover.Root
          open={showMentionPopover}
          onOpenChange={setShowMentionPopover}
        >
          <S.PopoverAnchor
            style={{
              height: 1,
              left: mentionPosition.left,
              top: mentionPosition.top,
              width: 1,
            }}
          />
          <Popover.Portal>
            <S.PopoverContent
              sideOffset={5}
              align="start"
              onOpenAutoFocus={(e) => e.preventDefault()}
              // className={classNames([accent, theme])}
            >
              <Tabs.Root
                value={selectedTab}
                onValueChange={(val) => {
                  setSelectedTab(val);
                  setFocusedItemIndex(0);
                }}
              >
                <S.TabsList>
                  {mentionTabs.map((tab) => (
                    <S.TabsTrigger key={tab.id} value={tab.id}>
                      {tab.label}
                    </S.TabsTrigger>
                  ))}
                </S.TabsList>

                {mentionTabs.map((tab) => (
                  <S.TabsContent key={tab.id} value={tab.id}>
                    {isMentionLoading ? (
                      <S.LoadingWrapper>
                        <S.Spinner />
                      </S.LoadingWrapper>
                    ) : mentionItems.length > 0 ? (
                      mentionItems.map((item, index) => (
                        <S.MentionItem
                          key={item.id}
                          $focused={index === focusedItemIndex}
                          onClick={() => insertMention(item)}
                          datatype={item.type}
                        >
                          <AvatarNew src={item.image} alt={item.displayName} />
                          <S.MentionName>{item.displayName}</S.MentionName>
                        </S.MentionItem>
                      ))
                    ) : (
                      <S.EmptyMessage>
                        No {tab.label.toLowerCase()} found
                      </S.EmptyMessage>
                    )}
                  </S.TabsContent>
                ))}
              </Tabs.Root>
            </S.PopoverContent>
          </Popover.Portal>
        </Popover.Root>
      </S.EditorWrapper>

      {/* <S.SaveButtonWrapper>
        <S.SaveButton type="button" onClick={handleSave}>
          <TbZoomPan size={20} />
          Open in full screen
        </S.SaveButton>
      </S.SaveButtonWrapper> */}
    </S.Container>
  );
};

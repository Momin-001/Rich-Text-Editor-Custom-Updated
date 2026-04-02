"use client";
// import { useCallback } from "react";
import { useEffect, useRef, useState } from "react";
// import { usePageRouter } from "@/hooks/use-page-router";
// import { ROUTES } from "@/utils/constants/routes";
import * as S from "./styled";

interface RichTextRendererProps {
  savedText: string;
  collapsedHeight?: number;
  overlayHidden?: boolean;
  disableCollapse?: boolean;
}

export const RichTextRenderer = ({
  savedText = "",
  collapsedHeight = 160,
  overlayHidden = false,
  disableCollapse = false,
}: RichTextRendererProps) => {
  // const { routeToPage } = usePageRouter();

  const contentRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [expanded, setExpanded] = useState(false);
  const [maxHeight, setMaxHeight] = useState<string>(`${collapsedHeight}px`);
  const [animating, setAnimating] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);

  // const onUserTagClick = useCallback(
  //   (userId: string) => {
  //     // console.log("authState", authState);
  //     routeToPage(ROUTES.User.View(userId));
  //     // console.log("user click:", userId, routeToPage);
  //   },
  //   [routeToPage],
  // );

  // const onItemTagClick = useCallback(
  //   (itemId : string) => {
  //     routeToPage(ROUTES.Item.View(itemId));
  //   },
  //   [routeToPage],
  // );

  // Inject HTML + attach click delegation
  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;

    // Create a temporary DOM element to manipulate the HTML
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = savedText;

    // Set the cleaned HTML
    container.innerHTML = tempDiv.innerHTML;
    // container.innerHTML = savedText;

    const handleMentionClick = (e: Event) => {
      const target = e.target as HTMLElement;
      const mentionTag = target.closest(".mention-tag") as HTMLElement | null;

      if (!mentionTag) return;

      const { type, id } = mentionTag.dataset;
      if (!type || !id) return;

      // if (type === "USER") onUserTagClick(id);
      // if (type === "ITEM") onItemTagClick(id);
    };

    container.addEventListener("click", handleMentionClick);

    return () => {
      container.removeEventListener("click", handleMentionClick);
    };
  }, [savedText]);

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    if (disableCollapse) {
      // Defer setState to avoid cascading renders inside the effect body.
      const timeoutId = window.setTimeout(() => {
        setIsOverflowing(false);
        setMaxHeight("none");
        setAnimating(false);
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }

    const contentHeight = content.scrollHeight;
    const shouldOverflow = contentHeight > collapsedHeight + 4;

    setIsOverflowing(shouldOverflow);

    // ✅ Short content → no maxHeight restriction at all
    if (!shouldOverflow) {
      setMaxHeight("none");
      setAnimating(false);
      return;
    }

    // Long content
    if (expanded) {
      setMaxHeight(`${contentHeight}px`);
    } else {
      setMaxHeight(`${collapsedHeight}px`);
    }

    setAnimating(true);
    const timeout = setTimeout(() => setAnimating(false), 160);
    return () => clearTimeout(timeout);
  }, [expanded, savedText, collapsedHeight, disableCollapse]);

  if (!savedText.length) {
    return (
      <S.Container>
        <S.EmptyState>
          <S.EmptyText>Loading</S.EmptyText>
        </S.EmptyState>
      </S.Container>
    );
  }

  return (
    <S.Container>
      <S.ContentWrapper
        ref={wrapperRef}
        style={{ maxHeight }}
        $animating={animating}
      >
        <S.SavedContent ref={contentRef} />
        {!disableCollapse && !expanded && isOverflowing && !overlayHidden && (
          <S.FadeOverlay />
        )}
      </S.ContentWrapper>

      {!disableCollapse && isOverflowing && (
        <S.Toggle onClick={() => setExpanded((v) => !v)}>
          {expanded ? "Show less..." : "Read more..."}
        </S.Toggle>
      )}
    </S.Container>
  );
};

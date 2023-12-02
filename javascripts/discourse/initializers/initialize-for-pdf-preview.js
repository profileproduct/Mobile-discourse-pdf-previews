import { withPluginApi } from "discourse/lib/plugin-api";
import { iconHTML } from "discourse-common/lib/icon-library";

const PREVIEW_HEIGHT = 500;

export default {
  name: "pdf-previews",
  initialize(container) {
    withPluginApi("0.8.41", (api) => {
      // The mobile view check has been removed

      try {
        const previewModeSetting = settings.preview_mode;
        const newTabIcon = () => {
          const template = document.createElement("template");
          template.innerHTML = iconHTML("external-link-alt", {
            class: "new-tab-pdf-icon",
          });
          return template.content.firstChild;
        };

        const createPreviewElement = () => {
          const iframe = document.createElement("iframe");
          iframe.src = "";
          iframe.type = "application/pdf";
          iframe.height = PREVIEW_HEIGHT;
          iframe.loading = "lazy";
          iframe.classList.add("pdf-preview");

          return iframe;
        };

        const setUpPreviewType = (pdf, renderMode) => {
          if (renderMode === "Inline") {
            const preview = createPreviewElement();
            pdf.classList.add("pdf-attachment");
            pdf.after(preview);

            return preview;
          }

          if (renderMode === "New Tab") {
            pdf.classList.add("new-tab-pdf");
            pdf.prepend(newTabIcon());
          }
        };

        api.decorateCookedElement(
          (post) => {
            const attachments = [...post.querySelectorAll(".attachment")];

            const pdfs = attachments.filter((attachment) =>
              /\.pdf$/i.test(attachment.href)
            );

            pdfs.forEach((pdf) => {
              const fileSize = pdf.nextSibling;
              if (fileSize) {
                fileSize.nodeValue = "";
              }

              const startsWithWhitespace = /^\s+/;
              const fileName = pdf.innerText;

              // Open the pdf in a new tab if either the global setting is
              // "New Tab" or if the pdf description starts with a whitespace
              // otherwise, render the preview inline in the post
              const renderMode =
                previewModeSetting === "New Tab" ||
                startsWithWhitespace.test(fileName)
                  ? "New Tab"
                  : "Inline";

              // We don't need the space anymore.
              pdf.innerText = pdf.innerText.trim();

              // Handle preview type
              const preview = setUpPreviewType(pdf, renderMode);

              // The pdf is set to Content-Disposition: attachment; filename="filename.pdf"
              // on the server. This means we can't just use the href as the
              // src for the pdf preview elements.
              const httpRequest = new XMLHttpRequest();
              httpRequest.open("GET", pdf.href);
              httpRequest.responseType = "blob";

              httpRequest.onreadystatechange = () => {
                if (httpRequest.readyState !== XMLHttpRequest.DONE) {
                  return;
                }

                if (httpRequest.status === 200) {
                  const src = URL.createObjectURL(httpRequest.response);

                  if (renderMode === "Inline") {
                    preview.src = src;
                  }

                  if (renderMode === "New Tab") {
                    pdf.addEventListener("click", (event) => {
                      event.preventDefault();
                      window.open(src);
                    });
                  }
                }
              };
              httpRequest.send();
            });
          },
          {
            id: "pdf-previews",
            onlyStream: true,
          }
        );
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(
          "There's an issue in the pdf previews theme component",
          error
        );
      }
    });
  },
};

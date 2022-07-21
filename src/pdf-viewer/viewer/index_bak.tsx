// @ts-nocheck
import { useEffect, useMemo, useRef, useState } from "react";
// import * as PDFJS from "pdfjs-dist/build/pdf";
import * as PDFJSViewer from "pdfjs-dist/web/pdf_viewer";
import * as PDFJS from "pdfjs-dist/webpack";
import useFirstEffect from "../../hooks/useFirstEffect";
import "./index.css";
import Control from "../control";
import matrixExt from "../helper/matrix-ext";
import pdfRender from "../helper/pdf-render";
import * as math from "mathjs";

const pdfFileURL =
  "https://d1.music.126.net/dmusic/obj/w5zCg8OAw6HDjzjDgMK_/15834321051/c5d1/b45c/1805/651766d32ded09ad74166e24aa2cbed9.pdf?download=1.pdf";
const CSS_UNITS = 96.0 / 72.0;

export default function Viewer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [sheetLoaded, setSheetLoaded] = useState(false);
  const [scale, setScale] = useState(96.0 / 72.0);
  const viewTransformRef = useRef(matrixExt.identity());
  const pdfPageViewRef = useRef(null);
  const pdfPageRef = useRef(null);

  useFirstEffect(() => {
    if (!containerRef.current) return;

    var loadingTask = PDFJS.getDocument(pdfFileURL);
    loadingTask.promise.then(
      (pdfDocument) => {
        pdfDocument.getPage(1).then(function (pdfPage) {
          var width = containerRef.current?.clientWidth || 600;
          var viewport = pdfPage.getViewport();
          var SCALE = width / viewport.width / CSS_UNITS;

          let eventBus = new PDFJSViewer.EventBus();
          var pdfPageView = new PDFJSViewer.PDFPageView({
            container: containerRef.current,
            id: 1,
            scale: SCALE,
            defaultViewport: pdfPage.getViewport({ scale: SCALE }),
            textLayerFactory: new PDFJSViewer.DefaultTextLayerFactory(),
            annotationLayerFactory:
              new PDFJSViewer.DefaultAnnotationLayerFactory(),
            eventBus,
          });

          pdfPageView.setPdfPage(pdfPage);
          pdfPageView.draw();
          setSheetLoaded(true);
          pdfPageViewRef.current = pdfPageView;
          pdfPageRef.current = pdfPage;
        });
      },
      (reason) => {
        // PDF loading error
        console.error(reason);
      }
    );
  }, []);

  const { width, height } = useMemo(() => {
    if (!pdfPageViewRef.current) return { width: 0, height: 0 };
    return {
      width: pdfPageViewRef.current.div.clientWidth,
      height: pdfPageViewRef.current.div.clientHeight,
    };
  }, [pdfPageViewRef.current]);

  const zoomIn = () => {
    if (!sheetLoaded) return;
    let scale = 1 / 0.75;
    let fixPt = [width / 2, height / 2, 0];
    zoom(scale, fixPt);
  };
  const zoom = (scale, fixPt) => {
    var matrix = matrixExt.fromScale(scale, scale, 1, fixPt);
    updateView(matrix);
  };

  const updateView = (transform) => {
    var t = !transform ? matrixExt.identity() : transform;
    setViewTransform(math.multiply(viewTransformRef.current, t));
  };

  const setViewTransform = (transform) => {
    if (!transform) return;

    var incrementalTransform = math
      .chain(math.inv(viewTransformRef.current))
      .multiply(transform)
      .done();

    viewTransformRef.current = transform;

    pdfRender.transformPdfPageView(
      pdfPageRef.current,
      pdfPageViewRef.current,
      transform,
      width,
      height
    );
  };

  return (
    <div>
      <Control zoomIn={zoomIn} />
      <div className="pdf-view-container" ref={containerRef}></div>;
    </div>
  );
}

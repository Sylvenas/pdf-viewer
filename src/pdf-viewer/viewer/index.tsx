// @ts-nocheck
import { useEffect, useMemo, useRef, useState } from "react";
// import * as PDFJS from "pdfjs-dist/build/pdf";
import * as PDFJSViewer from "pdfjs-dist/web/pdf_viewer";
import * as PDFJS from "pdfjs-dist/webpack";

import "pdfjs-dist/web/pdf_viewer.css";
import useFirstEffect from "../../hooks/useFirstEffect";
import "./index.css";
import Control from "../control";
import matrixExt from "../helper/matrix-ext";
import pdfRender from "../helper/pdf-render";
import * as math from "mathjs";
import pdffile from "./1.pdf";

// PDFJS.GlobalWorkerOptions.workerSrc =
//   "https://cdn.bootcdn.net/ajax/libs/pdf.js/2.14.305/pdf.worker.js";

// console.log(PDFJS);

function calculateModelTransform(sheetModelBounds, pdfPageWidth) {
  var scale = pdfPageWidth / sheetModelBounds.width;

  var matrix = matrixExt.fromTranslate(
    -sheetModelBounds.x,
    -sheetModelBounds.y,
    0
  );
  return math
    .chain(matrix)
    .multiply(matrixExt.fromScale(scale, scale, 1, [0, 0, 0]))
    .done();
}

const pdfFileURL =
  "https://d1.music.126.net/dmusic/obj/w5zCg8OAw6HDjzjDgMK_/15834321051/c5d1/b45c/1805/651766d32ded09ad74166e24aa2cbed9.pdf?download=1.pdf";

const containerWidth = 600;
const containerHeight = 400;

export default function Viewer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [sheetLoaded, setSheetLoaded] = useState(false);
  const viewTransformRef = useRef(matrixExt.identity());
  const pdfPageViewRef = useRef(null);
  const pdfPageRef = useRef(null);
  const modelTransformRef = useRef(null);
  const updating = useRef(false);
  const tickRef = useRef(0);
  const countRef = useRef(null);

  const sheetBoundsRef = useRef({});

  useFirstEffect(() => {
    if (!containerRef.current) return;

    var loadingTask = PDFJS.getDocument(pdffile);
    loadingTask.promise.then(
      (pdfDocument) => {
        pdfDocument.getPage(1).then(function (pdfPage) {
          let eventBus = new PDFJSViewer.EventBus();
          // const tool = new PDFCursorTools({
          //   container: containerRef.current,
          //   eventBus,
          //   cursorToolOnLoad: 1,
          // });
          // tool.switchTool(1);
          var viewport = pdfPage.getViewport({ scale: 1 });
          var bounds = initSheetBounds(pdfPage);
          var mtx = calculateModelTransform(bounds, viewport.width);
          modelTransformRef.current = mtx;

          setSheetLoaded(true);
          pdfPageViewRef.current = pdfRender.createPdfPageView(
            pdfPage,
            containerRef.current,
            eventBus
          );

          // pdfPageViewRef.current.div.style.position = "absolute";

          pdfPageRef.current = pdfPage;
          // debugger;
          var transform = matrixZoomToFit();
          // debugger;
          pdfRender
            .transformPdfPageView(
              pdfPageRef.current,
              pdfPageViewRef.current,
              transform,
              containerWidth,
              containerHeight
            )
            .then(() => {
              setViewTransform(transform);
            });

          // pdfPageViewRef.current.draw();
          // setViewTransform(transform);
        });
      },
      (reason) => {
        // PDF loading error
        console.error(reason);
      }
    );
  }, []);

  function initSheetBounds(pdfPage) {
    const sheetBounds = sheetBoundsRef.current;
    var isValid =
      sheetBounds &&
      sheetBounds.origin_x != null &&
      sheetBounds.origin_y != null &&
      sheetBounds.width != null &&
      sheetBounds.height != null;
    if (isValid)
      sheetBoundsRef.current = {
        x: sheetBounds.origin_x,
        y: sheetBounds.origin_y,
        width: sheetBounds.width,
        height: sheetBounds.height,
      };
    else {
      var pdfBounds = pdfPage.getViewport({ scale: 1 });
      sheetBoundsRef.current = {
        x: 0,
        y: 0,
        width: pdfBounds.width,
        height: pdfBounds.height,
      };
    }

    return sheetBoundsRef.current;
  }

  function matrixZoomToFit() {
    // TODO: consider issues bounds
    var bounds = matrixExt.transformBounds(
      modelTransformRef.current,
      sheetBoundsRef.current
    );
    bounds = matrixExt.transformBounds(modelTransformRef.current, bounds);
    var boundsAspect = bounds.width / bounds.height;
    var viewerAspect = containerWidth / containerHeight;
    var scale =
      boundsAspect < viewerAspect
        ? containerHeight / bounds.height
        : containerWidth / bounds.width;

    var boundsCenterX = bounds.x + bounds.width / 2;
    var boundsCenterY = bounds.y + bounds.height / 2;

    var viewerCenterX = containerWidth / 2;
    var viewerCenterY = containerHeight / 2;

    return math
      .chain(
        matrixExt.fromScale(scale, scale, 1, [boundsCenterX, boundsCenterY, 0])
      )
      .multiply(
        matrixExt.fromTranslate(
          viewerCenterX - boundsCenterX,
          viewerCenterY - boundsCenterY
        )
      )
      .done();
  }

  const center = () => {
    setViewTransform(matrixZoomToFit());
  };

  const zoomIn = () => {
    if (!sheetLoaded) return;
    let scale = 1 / 0.75;
    let fixPt = [
      pdfPageViewRef.current.div.clientWidth / 2,
      pdfPageViewRef.current.div.clientHeight / 2,
      0,
    ];
    zoom(scale, fixPt);
  };

  const zoomOut = () => {
    if (!sheetLoaded) return;
    let scale = 0.75;
    let fixPt = [
      pdfPageViewRef.current.div.clientWidth / 2,
      pdfPageViewRef.current.div.clientHeight / 2,
      0,
    ];
    // debugger;
    zoom(scale, fixPt);
  };
  const zoom = (scale, fixPt) => {
    var matrix = matrixExt.fromScale(scale, scale, 1, fixPt);
    updateView(matrix);
  };

  const updateView = (transform) => {
    var t = !transform ? matrixExt.identity() : transform;
    // Maybe requestIdleCallback is a better solution
    // However, Apple Safari does not support this API, and introducing polyfill will lead to more complexity than it's worth
    setTimeout(() => {
      setViewTransform(math.multiply(viewTransformRef.current, t));
    });
    // if ("requestIdleCallback" in window) {
    //   requestIdleCallback(() => {
    //     setViewTransform(math.multiply(viewTransformRef.current, t));
    //   });
    // } else {
    //   setTimeout(() => {
    //     setViewTransform(math.multiply(viewTransformRef.current, t));
    //   });
    // }
  };

  const setViewTransform = (transform) => {
    // tickRef.current = tickRef.current + 1;
    // countRef.current.innerHTML = tickRef.current;
    if (updating.current) return;
    if (!transform) return;

    // var incrementalTransform = math
    //   .chain(math.inv(viewTransformRef.current))
    //   .multiply(transform)
    //   .done();

    viewTransformRef.current = transform;

    pdfRender
      .transformPdfPageView(
        pdfPageRef.current,
        pdfPageViewRef.current,
        transform,
        pdfPageViewRef.current.div.clientWidth,
        pdfPageViewRef.current.div.clientHeight
      )
      .then(() => {
        updating.current = false;
      });
  };

  useEffect(() => {
    const onWheel = (event) => {
      const zoomIn = event.deltaY < 0;
      var scale = zoomIn ? 1 / 0.95 : 0.95;
      var fixPt = [event.offsetX, event.offsetY, 0];
      zoom(scale, fixPt);
      event.preventDefault();
    };
    containerRef.current.addEventListener("wheel", onWheel);
  }, []);

  function translate(deltaX, deltaY) {
    // debugger;
    var translateMtx = matrixExt.fromTranslate(deltaX, deltaY);
    updateView(translateMtx);
  }

  useEffect(() => {
    let startX, startY;
    let delayX = 0,
      delayY = 0;
    const onMousedown = (event) => {
      event.preventDefault();
      startX = event.pageX;
      startY = event.pageY;
      document.body.addEventListener("mousemove", onMouseMove);
      document.body.addEventListener("mouseup", onMouseUp);
    };

    const onMouseUp = () => {
      document.body.removeEventListener("mousemove", onMouseMove);
      document.body.removeEventListener("mouseup", onMouseUp);
    };

    const onMouseMove = (event) => {
      var deltaX = event.pageX - startX;
      var deltaY = event.pageY - startY;

      // if (updating.current) {
      //   delayX = deltaX;
      //   delayY = deltaY;
      //   return;
      // }
      translate(deltaX, deltaY);
      startX = event.pageX;
      startY = event.pageY;
      // delayX = 0;
      // delayY = 0;
    };
    containerRef.current?.addEventListener("mousedown", onMousedown);
  }, []);

  return (
    <div>
      <p id="count" ref={countRef}></p>
      <Control zoomIn={zoomIn} center={center} zoomOut={zoomOut} />
      <div className="pdf-view-container" ref={containerRef}>
        <div className="placeholder"></div>
      </div>
    </div>
  );
}

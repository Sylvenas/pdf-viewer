// @ts-nocheck
import matrixExt, { Box } from "./matrix-ext";
// import "pdfjs-dist/build/pdf";
// import "pdfjs-dist/web/pdf_viewer";
// import PDFJS from "pdfjs-dist/webpack";
import * as math from "mathjs";
import * as PDFJSViewer from "pdfjs-dist/web/pdf_viewer";
import * as PDFJS from "pdfjs-dist/webpack";
import { PageViewport } from "pdfjs-dist/lib/display/display_utils";

// console.log(PDFJSViewer, PDFJS);

function createPdfRender() {
  return {
    createPdfPageView: function (pdfPage, toElement: HTMLElement, eventBus) {
      var pdfPageView = new PDFJSViewer.PDFPageView({
        eventBus,
        container: toElement,
        id: 0,
        scale: 1,
        defaultViewport: pdfPage.getViewport({ scale: 1 }),
        // textLayerFactory: new PDFJS.DefaultTextLayerFactory(),
        annotationLayerFactory: new PDFJSViewer.DefaultAnnotationLayerFactory(),
      });

      pdfPageView.setPdfPage(pdfPage);

      pdfPage.cleanup();

      return pdfPageView;
    },

    // return promise
    transformPdfPageView: function (
      page,
      pageView,
      transform,
      canvasWidth,
      canvasHeight
    ) {
      var pageBox = pageView.pdfPage.view;
      var pageBoxCenter = this.centerOfBox(pageBox);
      var viewMtx = transform;

      var rotation = pageView.pdfPageRotate % 360;

      var toCenterMtx = matrixExt.fromTranslate(
        -pageBoxCenter[0],
        -pageBoxCenter[1]
      );
      var rotationMtx = matrixExt.fromRotationInXY(
        (rotation * 3.14159) / 180,
        [0, 0, 0]
      );
      var flipMtx = matrixExt.fromScale(1, -1, 1, [0, 0, 0]);

      var pdfMtx = math
        .chain(toCenterMtx)
        .multiply(flipMtx)
        .multiply(rotationMtx)
        .done();

      var rotatedPageBox = matrixExt.transformBox(rotationMtx, pageBox);
      var rotatedPageBoxCenter = this.centerOfBox(rotatedPageBox);
      var toLeftUpperMtx = matrixExt.fromTranslate(
        rotatedPageBoxCenter[0],
        rotatedPageBoxCenter[1]
      );

      pdfMtx = math.chain(pdfMtx).multiply(toLeftUpperMtx).done();

      var finalMtx = math.chain(pdfMtx).multiply(viewMtx).done();

      var finalInvMtx = math.inv(finalMtx);
      var canvasViewBox = [0, 0, canvasWidth, canvasHeight];

      var pdfBox = matrixExt.transformBox(finalInvMtx, canvasViewBox);

      var scale = matrixExt.getScale(viewMtx);
      // https://github.com/mozilla/pdf.js/issues/12980

      // console.log("pageView", pageView);
      // console.log("page", page.view);

      // page.view = pdfBox;

      var viewport = new PageViewport({
        viewBox: pdfBox,
        scale: scale.x,
        rotation,
        offsetX: 0,
        offsetY: 0,
        dontFlip: false,
      });

      viewport.width = 600;
      viewport.height = 400;

      // console.log("canvasViewBox", canvasViewBox);
      // console.log("scale", scale);
      // console.log("pdfBox", pdfBox);
      console.log("viewport.width", viewport.width);

      pageView.viewport = viewport;
      debugger;
      pageView.reset(false, false, false);
      return pageView.draw();
    },

    //Deprecated: transform with scale limitation
    transformPdfPageView2: function (
      pageView,
      transform,
      canvasWidth,
      canvasHeight
    ) {
      // TODO: update the pdf page view's viewport, so that we only render the displayed part of pdf view.
      var cssUnitsFactor = 96.0 / 72.0;
      var cssUnitsMtx = matrixExt.fromScale(
        1 / cssUnitsFactor,
        1 / cssUnitsFactor
      );
      var mtx = math.multiply(cssUnitsMtx, transform);

      var scale = matrixExt.getScale(mtx);
      pageView.update(scale.x);

      var offset = matrixExt.getTranslate(mtx);
      pageView.div.style.left = offset.x + "px";
      pageView.div.style.top = offset.y + "px";

      return pageView.draw();
    },

    centerOfBox: function (box: Box) {
      return [(box[2] - box[0]) / 2, (box[3] - box[1]) / 2];
    },
  };
}

const pdfRender = createPdfRender();

export default pdfRender;

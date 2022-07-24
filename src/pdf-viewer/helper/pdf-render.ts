// @ts-nocheck
import matrixExt, { Box } from "./matrix-ext";
import * as math from "mathjs";
import * as PDFJSViewer from "pdfjs-dist/web/pdf_viewer";
import { PageViewport } from "pdfjs-dist/lib/display/display_utils";

function createPdfRender() {
  return {
    createPdfPageView: function (pdfPage, toElement: HTMLElement, eventBus) {
      // debugger;
      var pdfPageView = new PDFJSViewer.PDFPageView({
        eventBus,
        container: toElement,
        id: 0,
        scale: 1,
        defaultViewport: pdfPage.getViewport({ scale: 1 }),
        // textLayerFactory: new PDFJS.DefaultTextLayerFactory(),
        // annotationLayerFactory: new PDFJSViewer.DefaultAnnotationLayerFactory(),
        // structTreeLayerFactory: new PDFJSViewer.DefaultStructTreeLayerFactory(),
      });
      // debugger;

      pdfPageView.setPdfPage(pdfPage);
      // pdfPageView.zoomLayer = document.querySelector(".page");
      // pdfPage.cleanup();
      console.log("pdfPageView", pdfPageView);
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
      // console.log("viewport.width", viewport.width);

      pageView.viewport = viewport;
      // console.log(pageView);
      // debugger;

      let canvas = document.querySelector("canvas");
      if (canvas) {
        pageView.zoomLayer = document.querySelector(".canvasWrapper");
      }

      // not work
      // pageView.update({ scale: scale.x, rotation });
      // console.log(pageView.zoomLayer);
      // debugger;
      pageView.reset({ keepZoomLayer: true });
      return pageView.draw();
    },

    //Deprecated: transform with scale limitation

    centerOfBox: function (box: Box) {
      return [(box[2] - box[0]) / 2, (box[3] - box[1]) / 2];
    },
  };
}

const pdfRender = createPdfRender();

export default pdfRender;

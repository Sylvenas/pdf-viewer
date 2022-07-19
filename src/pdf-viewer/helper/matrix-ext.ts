import * as math from "mathjs";
import type { Unit, Matrix } from "mathjs";

export type Box = [number, number, number, number];
export type Bounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function createMatrix() {
  return {
    fromTranslate: translate,
    fromRotation: rotate,
    fromRotationInXY: rotateInXY,
    fromScale: scale,
    identity: function () {
      return math.identity(4, 4);
    },
    zeroVector: function () {
      return math.zeros(3);
    },

    getScale: getScaleFactor,
    getTranslate: getTranslateFactor,

    transformBounds: applyToBounds,
    transformBox: applyToBox,
    toAffineTransform: toAffineTransform,
  };

  function translate(tx: number, ty: number, tz?: number) {
    // TODO: can only input tx, ty
    if (tz == undefined) tz = 0;
    return math.matrix([
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [tx, ty, tz, 1],
    ]);
  }

  function rotate(angle: number | Unit) {
    //TODO:
    // only support rotate around x
    var ca = math.cos(angle);
    var sa = math.sin(angle);
    return math.matrix([
      [1, 0, 0, 0],
      [0, ca, sa, 0],
      [0, -sa, ca, 0],
      [0, 0, 0, 1],
    ]);
  }

  function rotateInXY(angle: number | Unit, point: number[]) {
    var ca = math.cos(angle);
    var sa = math.sin(angle);
    var rotateMtx = math.matrix([
      [ca, sa, 0, 0],
      [-sa, ca, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1],
    ]);
    var transMtx = translate(-point[0], -point[1], -point[2]);
    var invTransMtx = translate(point[0], point[1], point[2]);

    return math
      .chain(transMtx)
      .multiply(rotateMtx)
      .multiply(invTransMtx)
      .done();
  }

  function scale(sx: number, sy: number, sz?: number, fixedPt?: number[]) {
    // TODO: can only input sx, sy
    if (fixedPt == undefined) fixedPt = [0, 0, 0];
    if (sz == undefined) sz = 1.0;

    var fixedTranslate = translate(-fixedPt[0], -fixedPt[1], -fixedPt[2]);

    var scale = math.matrix([
      [sx, 0, 0, 0],
      [0, sy, 0, 0],
      [0, 0, sz, 0],
      [0, 0, 0, 1],
    ]);

    var invertTranslate = translate(fixedPt[0], fixedPt[1], fixedPt[2]);

    var mtx = math.multiply(fixedTranslate, scale);
    return math.multiply(mtx, invertTranslate);
  }

  function getScaleFactor(mtx: Matrix) {
    var x = mtx.subset(math.index(0, 0)) as unknown as number;
    var y = mtx.subset(math.index(1, 1)) as unknown as number;
    var z = mtx.subset(math.index(2, 2)) as unknown as number;

    return { x: x, y: y, z: z };
  }

  function getTranslateFactor(mtx: Matrix) {
    var x = mtx.subset(math.index(3, 0));
    var y = mtx.subset(math.index(3, 1));
    var z = mtx.subset(math.index(3, 2));

    return { x: x, y: y, z: z };
  }
  // box: [xmin, ymin, xmax, ymax]
  function applyToBox(mtx: any, box: any) {
    var min = math.multiply([box[0], box[1], 0, 1], mtx) as any;
    var max = math.multiply([box[2], box[3], 0, 1], mtx) as any;
    var minX = math.min([min.subset(math.index(0)), max.subset(math.index(0))]);
    var maxX = math.max([min.subset(math.index(0)), max.subset(math.index(0))]);
    var minY = math.min([min.subset(math.index(1)), max.subset(math.index(1))]);
    var maxY = math.max([min.subset(math.index(1)), max.subset(math.index(1))]);

    return [minX, minY, maxX, maxY];
  }

  function applyToBounds(mtx: Matrix, bounds: Bounds) {
    var point = math.multiply(
      [bounds.x, bounds.y, 0, 1],
      mtx
    ) as unknown as Matrix;
    var scale = getScaleFactor(mtx);

    return {
      x: point.subset(math.index(0)),
      y: point.subset(math.index(1)),
      width: bounds.width * scale.x,
      height: bounds.height * scale.y,
    };
  }

  function toAffineTransform(matrix: Matrix) {
    var a = matrix.subset(math.index(0, 0));
    var b = matrix.subset(math.index(0, 1));
    var c = matrix.subset(math.index(1, 0));
    var d = matrix.subset(math.index(1, 1));
    var e = matrix.subset(math.index(3, 0));
    var f = matrix.subset(math.index(3, 1));

    return [a, b, c, d, e, f];
  }
}

const matrixExt = createMatrix();

export default matrixExt;

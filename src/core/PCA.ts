/*
 * @Author: Yumeng Xue
 * @Date: 2021-12-27 23:56:20
 * @LastEditTime: 2022-07-06 20:47:19
 * @LastEditors: Yumeng Xue
 * @Description: 
 * @FilePath: /trend-mixer/src/core/PCA.ts
 */

type Matrix = number[][];

function computeDeviationMatrix(matrix: Matrix): Matrix {
    let unit = unitSquareMatrix(matrix.length);
    return subtract(matrix, scale(multiply(unit, matrix), 1 / matrix.length));
}

function computeMeanVector(data: Matrix): number[] {
    let unit = unitSquareMatrix(data.length);
    return scale(multiply(unit, data), 1 / data.length)[0];
}

function computeSVDDeviationScores(deviation: Matrix) {
    let devSumOfSquares = multiply(transpose(deviation), deviation);
    return devSumOfSquares;
}

function computeDeviationScores(deviation: Matrix) {
    let devSumOfSquares = multiply(deviation, transpose(deviation));
    return devSumOfSquares;
}

function computeVarianceCovariance(devSumOfSquares: Matrix, sample: boolean) {
    let varianceCovariance: Matrix;
    if (sample)
        varianceCovariance = scale(devSumOfSquares, 1 / (devSumOfSquares.length - 1));
    else
        varianceCovariance = scale(devSumOfSquares, 1 / (devSumOfSquares.length));
    return varianceCovariance;
}

function computeSVD(matrix: Matrix) {
    let result = svd(matrix);
    let eigenvectors = result.U;
    let eigenvalues = result.S;
    let results = eigenvalues.map((value: number, i: number) => {
        let obj = {
            eigenvalue: value,
            vector: eigenvectors.map((vector: number[]) => -1 * vector[i]) //HACK prevent completely negative vectors    
        };
        return obj;
    });
    return results;
}

function computeMahalanobisInvcovarianceMatrix(data: Matrix) {
    const covarianceMatrix = computeVarianceCovariance(computeSVDDeviationScores(computeDeviationMatrix(data)), true);
    const invCovarianceMatrix = inv(covarianceMatrix);
    return invCovarianceMatrix;
}

function computeMahalanobisDistance(data: Matrix, point: number[], invCovarianceMatrix: Matrix) {
    const meanVector = computeMeanVector(data);
    if (!invCovarianceMatrix) {
        const covarianceMatrix = computeVarianceCovariance(computeSVDDeviationScores(computeDeviationMatrix(data)), true);
        invCovarianceMatrix = inv(covarianceMatrix);
    }
    for (let i = 0; i < point.length; ++i) {
        point[i] -= meanVector[i];
    }
    const distance = multiply(multiply([point], invCovarianceMatrix), transpose([point]));
    //const distance = multiply([point], transpose([point]));
    return Math.sqrt(distance[0][0]);
}

function computeAdjustedData(data: Matrix, ...vectorObjs: { vector: number[], eigenvalue: number }[]) {
    //FIXME no need to transpose vectors since they're already in row normal form
    let vectors = vectorObjs.map(function (v) { return v.vector });
    let matrixMinusMean = computeDeviationMatrix(data);
    let adjustedData = multiply(vectors, transpose(matrixMinusMean));
    let unit = unitSquareMatrix(data.length);
    let avgData = scale(multiply(unit, data), -1 / data.length); //NOTE get the averages to add back

    let formattedAdjustData = formatData(adjustedData, 2);
    return {
        adjustedData: adjustedData,
        formattedAdjustedData: formattedAdjustData,
        avgData: avgData,
        selectedVectors: vectors
    };
}

function computeOriginalData(adjustedData: Matrix, vectors: Matrix, avgData: Matrix) {
    let originalWithoutMean = transpose(multiply(transpose(vectors), adjustedData));
    let originalWithMean = subtract(originalWithoutMean, avgData);
    let formattedData = formatData(originalWithMean, 2);
    return {
        originalData: originalWithMean,
        formattedOriginalData: formattedData
    }
}

function computePercentageExplained(vectors: { vector: number[], eigenvalue: number }[], ...selected: { vector: number[], eigenvalue: number }[]) {
    let total = vectors.map((v) => {
        return v.eigenvalue
    }).reduce((a, b) => {
        return a + b;
    });
    let explained = selected.map((v) => {
        return v.eigenvalue
    }).reduce((a, b) => {
        return a + b;
    });
    return (explained / total);
}

function getEigenVectors(data: Matrix) {
    return computeSVD(computeVarianceCovariance(computeSVDDeviationScores(computeDeviationMatrix(data)), false));
}

function analyseTopResult(data: Matrix) {
    let eigenVectors = getEigenVectors(data);
    let sorted = eigenVectors.sort((a, b) => b.eigenvalue - a.eigenvalue);
    let selected = sorted[0].vector;
    return computeAdjustedData(data, selected);
}

function computeReconsturctedData(data: Matrix, score: Matrix, mean: number[], ...vectors: { vector: number[], eigenvalue: number }[]) {

    let unit = unitSquareMatrix(data.length);
    let avgData = scale(multiply(unit, data), -1 / data.length); //NOTE get the averages to add back
    let vectorsMatrix = vectors.map((v) => {
        return v.vector;
    });
    let vectorsMatrixTranspose = transpose(vectorsMatrix);
    let reconstructedData = add(transpose(multiply(vectorsMatrixTranspose, transpose(score))), [mean]);
    let formattedReconstructedData = formatData(reconstructedData, 2);
    return {
        reconstructedData: reconstructedData,
        formattedReconstructedData: formattedReconstructedData,
        avgData: avgData,
        selectedVectors: vectorsMatrix
    };
}

function formatData(data: Matrix, precision: number) {
    let TEN = Math.pow(10, precision || 2);
    return data.map(function (d, i) {
        return d.map(function (n) {
            return Math.round(n * TEN) / TEN;
        })
    })
}

function multiply(a: Matrix, b: Matrix) {
    if (!a[0] || !b[0] || !a.length || !b.length) {
        throw new Error('Both A and B should be matrices');
    }

    if (b.length !== a[0].length) {
        throw new Error('Columns in A should be the same as the number of rows in B');
    }
    let product: number[][] = [];

    for (let i = 0; i < a.length; i++) {
        product[i] = []; //initialize a new row
        for (let j = 0; j < b[0].length; j++) {
            for (let k = 0; k < a[0].length; k++) {
                (product[i])[j] = !!(product[i])[j] ? (product[i])[j] + (a[i])[k] * (b[k])[j] : (a[i])[k] * (b[k])[j];
            }
        }
    }
    return product;
}

function add(a: Matrix, b: Matrix) {
    if (!(a.length === b.length && a[0].length === b[0].length))
        throw new Error('Both A and B should have the same dimensions');
    let result: number[][] = [];
    for (let i = 0; i < a.length; i++) {
        result[i] = [];
        for (let j = 0; j < b[0].length; j++) {
            (result[i])[j] = (a[i])[j] + (b[i])[j];
        }
    }
    return result;
}

function subtract(a: Matrix, b: Matrix) {
    if (!(a.length === b.length && a[0].length === b[0].length))
        throw new Error('Both A and B should have the same dimensions');
    let result: number[][] = [];
    for (let i = 0; i < a.length; i++) {
        result[i] = [];
        for (let j = 0; j < b[0].length; j++) {
            (result[i])[j] = (a[i])[j] - (b[i])[j];
        }
    }
    return result;
}

function scale(matrix: Matrix, factor: number) {
    let result: number[][] = [];
    for (let i = 0; i < matrix.length; i++) {
        result[i] = [];
        for (let j = 0; j < matrix[0].length; j++) {
            (result[i])[j] = (matrix[i])[j] * factor;
        }
    }
    return result;
}

function unitSquareMatrix(rows: number) {
    let result: number[][] = [];
    for (let i = 0; i < rows; i++) {
        result[i] = [];
        for (let j = 0; j < rows; j++) {
            (result[i])[j] = 1;
        }
    }
    return result;
}

function transpose(matrix: Matrix) {
    let operated = clone(matrix);
    return operated[0].map((m: number, c: number) => {
        return matrix.map(r => r[c]);
    });
}

function det(square: Matrix): number {
    // 方阵约束
    if (square.length !== square[0].length) {
        throw new Error();
    }
    // 方阵阶数
    let n = square.length;

    let result = 0;
    if (n > 3) {
        // n 阶
        for (let column = 0; column < n; column++) {
            // 去掉第 0 行第 column 列的矩阵
            let matrix = new Array(n - 1).fill(0).map(arr => new Array(n - 1).fill(0));
            for (let i = 0; i < n - 1; i++) {
                for (let j = 0; j < n - 1; j++) {
                    if (j < column) {
                        matrix[i][j] = square[i + 1][j];
                    } else {
                        matrix[i][j] = square[i + 1][j + 1];
                    }
                }
            }
            result += square[0][column] * Math.pow(-1, 0 + column) * det(matrix);
        }
    } else if (n === 3) {
        // 3 阶
        result = square[0][0] * square[1][1] * square[2][2] +
            square[0][1] * square[1][2] * square[2][0] +
            square[0][2] * square[1][0] * square[2][1] -
            square[0][2] * square[1][1] * square[2][0] -
            square[0][1] * square[1][0] * square[2][2] -
            square[0][0] * square[1][2] * square[2][1];
    } else if (n === 2) {
        // 2 阶
        result = square[0][0] * square[1][1] - square[0][1] * square[1][0];
    } else if (n === 1) {
        // 1 阶
        result = square[0][0];
    }
    return result;
}

function adjoint(square: Matrix): Matrix {
    // 方阵约束
    if (square[0].length !== square.length) {
        throw new Error();
    }

    let n = square.length;

    let result = new Array(n).fill(0).map(arr => new Array(n).fill(0));
    for (let row = 0; row < n; row++) {
        for (let column = 0; column < n; column++) {
            // 去掉第 row 行第 column 列的矩阵
            let matrix = [];
            for (let i = 0; i < square.length; i++) {
                if (i !== row) {
                    let arr = [];
                    for (let j = 0; j < square.length; j++) {
                        if (j !== column) {
                            arr.push(square[i][j]);
                        }
                    }
                    matrix.push(arr);
                }
            }
            result[row][column] = Math.pow(-1, row + column) * det(matrix);
        }
    }
    return transpose(result);
}

function inv(matrix: Matrix): Matrix {
    if (matrix[0].length !== matrix.length) {
        throw new Error();
    }
    let detValue = det(matrix);
    let result = adjoint(matrix);

    for (let i = 0; i < result.length; i++) {
        for (let j = 0; j < result.length; j++) {
            result[i][j] /= detValue;
        }
    }
    return result;
}

function diag(d: number[]): Matrix {
    let matrix: Matrix = [];
    for (let i = 0; i < d.length; i++) {
        matrix.push(new Array(d.length).fill(0));
        matrix[i][i] = d[i];
    }
    return matrix;
}

function clone(arr: Matrix) {
    let string = JSON.stringify(arr);
    let result = JSON.parse(string);
    return result;
}

/**
 * Compute the thin SVD from G. H. Golub and C. Reinsch, Numer. Math. 14, 403-420 (1970)
 * From the Numeric JS Implementation Copyright (C) 2011 by Sébastien Loisel
 * The C implementation from which this has been taken may be found here: http://www.public.iastate.edu/~dicook/JSS/paper/code/svd.c
 */
function svd(A: Matrix) {
    let temp: number;
    let prec = Math.pow(2, -52) // assumes double prec
    let tolerance = 1.e-64 / prec;
    let itmax = 50;
    let c = 0;
    let i = 0;
    let j = 0;
    let k = 0;
    let l = 0;
    let u = clone(A);
    let m = u.length;
    let n = u[0].length;

    if (m < n) throw "Need more rows than columns"

    let e = new Array(n); //vector1
    let q = new Array(n); //vector2
    for (i = 0; i < n; i++) e[i] = q[i] = 0.0;
    let v = rep([n, n], 0, undefined);

    function pythag(a: number, b: number) {
        a = Math.abs(a)
        b = Math.abs(b)
        if (a > b)
            return a * Math.sqrt(1.0 + (b * b / a / a))
        else if (b === 0.0)
            return a
        return b * Math.sqrt(1.0 + (a * a / b / b))
    }

    //rep function
    function rep(s: [number, number], v: number, k: number | undefined) {
        if (typeof k === "undefined") {
            k = 0;
        }
        let n = s[k],
            ret = Array(n),
            i: number;
        if (k === s.length - 1) {
            for (i = n - 2; i >= 0; i -= 2) {
                ret[i + 1] = v;
                ret[i] = v;
            }
            if (i === -1) {
                ret[0] = v;
            }
            return ret;
        }
        for (i = n - 1; i >= 0; i--) {
            ret[i] = rep(s, v, k + 1);
        }
        return ret;
    }

    //Householder's reduction to bidiagonal form

    let f = 0.0;
    let g = 0.0;
    let h = 0.0;
    let x = 0.0;
    let y = 0.0;
    let z = 0.0;
    let s = 0.0;

    for (i = 0; i < n; i++) {
        e[i] = g; //vector
        s = 0.0; //sum
        l = i + 1; //stays i+1
        for (j = i; j < m; j++)
            s += (u[j][i] * u[j][i]);
        if (s <= tolerance)
            g = 0.0;
        else {
            f = u[i][i];
            g = Math.sqrt(s);
            if (f >= 0.0) g = -g;
            h = f * g - s
            u[i][i] = f - g;
            for (j = l; j < n; j++) {
                s = 0.0
                for (k = i; k < m; k++)
                    s += u[k][i] * u[k][j]
                f = s / h
                for (k = i; k < m; k++)
                    u[k][j] += f * u[k][i]
            }
        }
        q[i] = g
        s = 0.0
        for (j = l; j < n; j++)
            s = s + u[i][j] * u[i][j]
        if (s <= tolerance)
            g = 0.0
        else {
            f = u[i][i + 1]
            g = Math.sqrt(s)
            if (f >= 0.0) g = -g
            h = f * g - s
            u[i][i + 1] = f - g;
            for (j = l; j < n; j++) e[j] = u[i][j] / h
            for (j = l; j < m; j++) {
                s = 0.0
                for (k = l; k < n; k++)
                    s += (u[j][k] * u[i][k])
                for (k = l; k < n; k++)
                    u[j][k] += s * e[k]
            }
        }
        y = Math.abs(q[i]) + Math.abs(e[i])
        if (y > x)
            x = y
    }

    // accumulation of right hand transformations
    for (i = n - 1; i !== -1; i += -1) {
        if (g !== 0.0) {
            h = g * u[i][i + 1]
            for (j = l; j < n; j++)
                v[j][i] = u[i][j] / h //u is array, v is square of columns
            for (j = l; j < n; j++) {
                s = 0.0
                for (k = l; k < n; k++)
                    s += u[i][k] * v[k][j]
                for (k = l; k < n; k++)
                    v[k][j] += (s * v[k][i])
            }
        }
        for (j = l; j < n; j++) {
            v[i][j] = 0;
            v[j][i] = 0;
        }
        v[i][i] = 1;
        g = e[i]
        l = i
    }

    // accumulation of left hand transformations
    for (i = n - 1; i !== -1; i += -1) {
        l = i + 1
        g = q[i]
        for (j = l; j < n; j++)
            u[i][j] = 0;
        if (g !== 0.0) {
            h = u[i][i] * g
            for (j = l; j < n; j++) {
                s = 0.0
                for (k = l; k < m; k++) s += u[k][i] * u[k][j];
                f = s / h
                for (k = i; k < m; k++) u[k][j] += f * u[k][i];
            }
            for (j = i; j < m; j++) u[j][i] = u[j][i] / g;
        } else
            for (j = i; j < m; j++) u[j][i] = 0;
        u[i][i] += 1;
    }

    // diagonalization of the bidiagonal form
    prec = prec * x
    for (k = n - 1; k !== -1; k += -1) {
        for (let iteration = 0; iteration < itmax; iteration++) { // test f splitting
            let test_convergence = false
            for (l = k; l !== -1; l += -1) {
                if (Math.abs(e[l]) <= prec) {
                    test_convergence = true
                    break
                }
                if (Math.abs(q[l - 1]) <= prec)
                    break
            }
            if (!test_convergence) { // cancellation of e[l] if l>0
                c = 0.0
                s = 1.0
                let l1 = l - 1
                for (i = l; i < k + 1; i++) {
                    f = s * e[i]
                    e[i] = c * e[i]
                    if (Math.abs(f) <= prec)
                        break
                    g = q[i]
                    h = pythag(f, g)
                    q[i] = h
                    c = g / h
                    s = -f / h
                    for (j = 0; j < m; j++) {
                        y = u[j][l1]
                        z = u[j][i]
                        u[j][l1] = y * c + (z * s)
                        u[j][i] = -y * s + (z * c)
                    }
                }
            }
            // test f convergence
            z = q[k]
            if (l === k) { //convergence
                if (z < 0.0) { //q[k] is made non-negative
                    q[k] = -z
                    for (j = 0; j < n; j++)
                        v[j][k] = -v[j][k]
                }
                break //break out of iteration loop and move on to next k value
            }
            if (iteration >= itmax - 1)
                throw 'Error: no convergence.'
            // shift from bottom 2x2 minor
            x = q[l]
            y = q[k - 1]
            g = e[k - 1]
            h = e[k]
            f = ((y - z) * (y + z) + (g - h) * (g + h)) / (2.0 * h * y)
            g = pythag(f, 1.0)
            if (f < 0.0)
                f = ((x - z) * (x + z) + h * (y / (f - g) - h)) / x
            else
                f = ((x - z) * (x + z) + h * (y / (f + g) - h)) / x
            // next QR transformation
            c = 1.0
            s = 1.0
            for (i = l + 1; i < k + 1; i++) {
                g = e[i]
                y = q[i]
                h = s * g
                g = c * g
                z = pythag(f, h)
                e[i - 1] = z
                c = f / z
                s = h / z
                f = x * c + g * s
                g = -x * s + g * c
                h = y * s
                y = y * c
                for (j = 0; j < n; j++) {
                    x = v[j][i - 1]
                    z = v[j][i]
                    v[j][i - 1] = x * c + z * s
                    v[j][i] = -x * s + z * c
                }
                z = pythag(f, h)
                q[i - 1] = z
                c = f / z
                s = h / z
                f = c * g + s * y
                x = -s * g + c * y
                for (j = 0; j < m; j++) {
                    y = u[j][i - 1]
                    z = u[j][i]
                    u[j][i - 1] = y * c + z * s
                    u[j][i] = -y * s + z * c
                }
            }
            e[l] = 0.0
            e[k] = f
            q[k] = x
        }
    }

    for (i = 0; i < q.length; i++)
        if (q[i] < prec) q[i] = 0

    //sort eigenvalues	
    for (i = 0; i < n; i++) {
        for (j = i - 1; j >= 0; j--) {
            if (q[j] < q[i]) {
                c = q[j]
                q[j] = q[i]
                q[i] = c
                for (k = 0; k < u.length; k++) {
                    temp = u[k][i];
                    u[k][i] = u[k][j];
                    u[k][j] = temp;
                }
                for (k = 0; k < v.length; k++) {
                    temp = v[k][i];
                    v[k][i] = v[k][j];
                    v[k][j] = temp;
                }
                i = j
            }
        }
    }

    return {
        U: u,
        S: q,
        V: v
    }
}

function pointDist(p1: number[], p2: number[]) {
    let sum = 0;
    for (let i = 0; i < p1.length; ++i) {
        sum += Math.pow(p1[i] - p2[i], 2);
    }
    return Math.sqrt(sum);
}

function geometricMedian(points: number[][]): number[] {
    let centriod = new Array(points[0].length).fill(0);
    for (let i = 0; i < centriod.length; i++) {
        for (let j = 0; j < points.length; j++) {
            centriod[i] += points[j][i];
        }
        centriod[i] /= points.length;
    }
    return centriod;
    while (true) {
        let newCentriod = new Array(points[0].length).fill(0);
        let count = 0;
        for (let point of points) {
            const dist = pointDist(point, centriod);
            const weight = 1 / dist;
            for (let i = 0; i < point.length; i++) {
                newCentriod[i] += point[i] * weight;
            }
            count += weight;
        }
        for (let i = 0; i < centriod.length; i++) {
            newCentriod[i] = newCentriod[i] / count;
        }
        if (pointDist(centriod, newCentriod) < 0.001) {
            break;
        }
        centriod = newCentriod;
    }
    return centriod;
}


export { computeMeanVector, computeOriginalData, computeAdjustedData, computeReconsturctedData, computePercentageExplained, computeMahalanobisInvcovarianceMatrix, computeMahalanobisDistance, getEigenVectors, analyseTopResult, geometricMedian };
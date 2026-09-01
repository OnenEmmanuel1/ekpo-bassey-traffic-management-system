/**
 * Adaptive Signal-Timing Algorithm
 * JunctionAI - Intelligent Traffic Control System
 * Location: Ekpo-Abasi Junction, Calabar South LGA, Cross River State
 *
 * Solves "Empty Lane Syndrome" and dynamic congestion balancing
 * by dynamically calculating Green phase durations from real-time per-lane vehicle density.
 */

class AdaptiveAlgorithm {
    /**
     * Calculates the dynamic Green phase duration for a specific approach lane.
     *
     * @param {number} laneDensity - Current simulated vehicle density for target lane (0 - 100)
     * @param {Array<number>} allDensities - Array of current densities across all active lanes
     * @param {Object} config - Timing constraints and weighting factors
     * @param {number} [config.minGreen=10] - Minimum green duration in seconds
     * @param {number} [config.maxGreen=60] - Maximum green duration in seconds
     * @param {number} [config.densityWeight=1.5] - Exponent/scaling weight for density influence
     * @returns {Object} Timing computation breakdown
     */
    static calculateGreenDuration(laneDensity, allDensities = [], config = {}) {
        const minGreen = parseInt(config.minGreen || 10, 10);
        const maxGreen = parseInt(config.maxGreen || 60, 10);
        const densityWeight = parseFloat(config.densityWeight || 1.5);

        const clampedDensity = Math.max(0, Math.min(100, Math.round(laneDensity || 0)));
        const totalDensity = allDensities.reduce((sum, d) => sum + Math.max(0, d || 0), 0);
        const laneCount = Math.max(1, allDensities.length);
        const avgDensity = totalDensity / laneCount;

        // Relative density ratio (0 to 1)
        const densityRatio = totalDensity > 0 ? (clampedDensity / totalDensity) : (1 / laneCount);

        // Absolute density percentage (0 to 1)
        const absoluteRatio = clampedDensity / 100;

        // Empty Lane Syndrome check: if lane density is negligible, allocate exact minimum green
        if (clampedDensity <= 5) {
            return {
                durationSeconds: minGreen,
                clampedDensity,
                relativeRatio: parseFloat(densityRatio.toFixed(3)),
                congestionLevel: 'Empty / Free Flow',
                reason: 'Empty Lane Syndrome Prevention: Min green assigned'
            };
        }

        // Weighted dynamic scaling factor
        // Blends absolute density demand with relative competition across opposing legs
        const dynamicFactor = Math.pow(absoluteRatio, 1 / densityWeight) * 0.7 + (densityRatio * laneCount / 2) * 0.3;
        const computedDuration = minGreen + (maxGreen - minGreen) * dynamicFactor;

        // Clamp securely between minGreen and maxGreen
        const finalDuration = Math.max(minGreen, Math.min(maxGreen, Math.round(computedDuration)));

        let congestionLevel = 'Low';
        if (clampedDensity >= 75) congestionLevel = 'Severe Congestion';
        else if (clampedDensity >= 50) congestionLevel = 'Moderate Delay';
        else if (clampedDensity >= 25) congestionLevel = 'Moderate Flow';

        return {
            durationSeconds: finalDuration,
            clampedDensity,
            relativeRatio: parseFloat(densityRatio.toFixed(3)),
            congestionLevel,
            reason: `Adaptive density scaling (Density: ${clampedDensity}%, Weight: ${densityWeight})`
        };
    }

    /**
     * Estimates traffic performance metrics (Queue length, throughput, estimated delay).
     *
     * @param {number} density - Vehicle density (0-100)
     * @param {number} greenSeconds - Allocated green duration
     * @returns {Object} Performance metrics
     */
    static estimatePerformanceMetrics(density, greenSeconds) {
        // Approximate vehicles in queue (max ~35 vehicles per approach lane at 100% density)
        const estimatedQueueVehicles = Math.round((density / 100) * 35);

        // Saturation flow rate: ~0.55 vehicles cleared per second of green
        const dischargeCapacity = Math.round(greenSeconds * 0.55);
        const vehiclesCleared = Math.min(estimatedQueueVehicles, dischargeCapacity);
        const residualQueue = Math.max(0, estimatedQueueVehicles - vehiclesCleared);

        // Estimated average waiting delay per vehicle in seconds
        const baseWait = 25; // baseline red wait
        const delaySeconds = Math.max(5, Math.round(baseWait + (residualQueue * 2.8)));

        return {
            estimatedQueueVehicles,
            vehiclesCleared,
            residualQueue,
            estimatedDelaySeconds: delaySeconds
        };
    }
}

module.exports = AdaptiveAlgorithm;

package com.example.Panacea.risk.service;

import java.util.List;

/**
 * A small, dependency-free binary logistic regression: standardizes each feature
 * column, then fits weights by batch gradient descent on log loss. Kept in-house
 * rather than pulling in an ML library (Smile/Weka) since the dataset here is tiny
 * (tens to low hundreds of students) — training takes low-single-digit milliseconds,
 * so {@link RiskScoringService} just retrains on every request instead of persisting
 * a model.
 */
final class LogisticRegressionModel {

    private static final int ITERATIONS = 1000;
    private static final double LEARNING_RATE = 0.3;

    private LogisticRegressionModel() {
    }

    record TrainedModel(double[] weights, double bias, double[] featureMeans, double[] featureStds) {
    }

    static TrainedModel train(List<double[]> features, List<Integer> labels) {
        int sampleCount = features.size();
        int dimensions = features.get(0).length;

        double[] means = new double[dimensions];
        double[] stds = new double[dimensions];
        for (int j = 0; j < dimensions; j++) {
            final int column = j;
            double mean = features.stream().mapToDouble(f -> f[column]).average().orElse(0.0);
            double variance = features.stream().mapToDouble(f -> Math.pow(f[column] - mean, 2)).average().orElse(0.0);
            means[j] = mean;
            stds[j] = variance < 1e-6 ? 1.0 : Math.sqrt(variance);
        }

        double[][] standardized = new double[sampleCount][dimensions];
        for (int i = 0; i < sampleCount; i++) {
            for (int j = 0; j < dimensions; j++) {
                standardized[i][j] = (features.get(i)[j] - means[j]) / stds[j];
            }
        }

        double[] weights = new double[dimensions];
        double bias = 0.0;

        for (int iteration = 0; iteration < ITERATIONS; iteration++) {
            double[] gradientWeights = new double[dimensions];
            double gradientBias = 0.0;

            for (int i = 0; i < sampleCount; i++) {
                double z = bias;
                for (int j = 0; j < dimensions; j++) {
                    z += weights[j] * standardized[i][j];
                }
                double error = sigmoid(z) - labels.get(i);
                for (int j = 0; j < dimensions; j++) {
                    gradientWeights[j] += error * standardized[i][j];
                }
                gradientBias += error;
            }

            for (int j = 0; j < dimensions; j++) {
                weights[j] -= LEARNING_RATE * gradientWeights[j] / sampleCount;
            }
            bias -= LEARNING_RATE * gradientBias / sampleCount;
        }

        return new TrainedModel(weights, bias, means, stds);
    }

    static double predict(TrainedModel model, double[] rawFeatures) {
        double z = model.bias();
        for (double term : contributionTerms(model, rawFeatures)) {
            z += term;
        }
        return sigmoid(z);
    }

    /**
     * The per-feature logit terms ({@code weight[j] * standardizedValue[j]}) that sum
     * (plus bias) into the value {@link #predict} runs through the sigmoid — i.e. how
     * much each feature pushed this prediction up or down. Bias is deliberately
     * excluded: it's the population base rate, not anything attributable to this
     * particular student.
     */
    static double[] contributionTerms(TrainedModel model, double[] rawFeatures) {
        double[] terms = new double[rawFeatures.length];
        for (int j = 0; j < rawFeatures.length; j++) {
            double standardizedValue = (rawFeatures[j] - model.featureMeans()[j]) / model.featureStds()[j];
            terms[j] = model.weights()[j] * standardizedValue;
        }
        return terms;
    }

    private static double sigmoid(double z) {
        return 1.0 / (1.0 + Math.exp(-z));
    }
}

# Kinetra: Smarter Recovery Starts at Home

## Demo
[![Watch the video](https://img.youtube.com/vi/BMAzPrpiKnI/hqdefault.jpg)](https://www.youtube.com/watch?v=BMAzPrpiKnI)

## Problem Statement
Current home-based physiotherapy often lacks personalization and continuous supervision. Patients are commonly prescribed standardized exercise programs with limited adaptation to their individual condition, pain level, mobility, or progress. Once patients leave the clinic, they typically perform exercises at home without professional guidance, making it difficult to ensure that exercises are performed correctly. This can lead to poor technique, reduced effectiveness, slower recovery, lower patient adherence, and an increased risk of re-injury.

## Solution
Kinetra is an AI-powered home physiotherapy platform that provides personalized rehabilitation guidance, real-time exercise supervision, and an interactive virtual physiotherapy coach. Unlike conventional home physiotherapy, Kinetra continuously monitors the user's performance, provides immediate feedback, and allows users to communicate naturally with an AI coach throughout their recovery.

## How it Works
The platform consists of two primary modules:

1. AI-powered coach (Conversational Assistant)
2. Exercise Monitoring using computer vision

## AI-powered Coach
The AI Coach enables users to ask rehabilitation-related questions before, during, or after their exercise sessions. Before any prompt reaches the language model, it is passed through a classifier that assigns confidence scores to predefined labels, such as:
- Non-health related
- Harmful medical advice
- Offensive content
- Prompt injection attempts
- Dangerous instructions
- Unrelated conversation

Each label has its own confidence threshold. If any confidence score exceeds its threshold:
- The prompt is blocked,
- the LLM is informed which safety rule was violated,
- the AI politely refuses the request.

Otherwise, the prompt is forwarded to the LLM for response generation.

This architecture prevents misuse while allowing normal physiotherapy conversations.

## Exercise Monitoring using Computer Vision
During an exercise session, Kinetra acts as an intelligent physiotherapy observer.

Google MediaPipe detects body landmarks from the live camera feed.

From these landmarks, Kinetra calculates:

1. Koint angles
2. Limb positions
3. Range of motion
4. Exercise repetitions
5. Movement quality

The detected skeleton is also displayed on the user's screen to provide visual confirmation that body tracking is functioning correctly.

All exercise metrics are stored in a database, enabling long-term progress tracking and allowing future sessions to be compared against previous performance.

If Voice Coach is enabled, Kinetra becomes an active rehabilitation assistant. Instead of merely reporting numerical measurements, the Range-of-Motion data is interpreted by the LLM, which generates natural coaching feedback such as:

- "Raise your left arm slightly higher."
- "Try to straighten your knee a little more."
- "Excellent posture—keep it up."
- "Slow down your movement."

This provides users with real-time supervision that resembles guidance from a physiotherapist.

In addition, users can interact with the AI coach entirely through voice. The interface continuously listens for the wake phrase "Hey Coach." Once detected:

1. The UI indicates that the assistant is listening,
2. The user's request is transcribed,
3. The request is processed by the AI Coach,
4. The response is spoken back using text-to-speech.

This hands-free interaction allows users to ask questions or request assistance without interrupting their exercises.

| Problem                                     | Kinetra Solution                                                                        |
| ------------------------------------------- | --------------------------------------------------------------------------------------- |
| Generic exercise plans                      | Personalized AI coaching tailored to user context and performance                       |
| No supervision at home                      | Real-time pose estimation and movement analysis using MediaPipe                         |
| Incorrect exercise form                     | Instant corrective voice feedback during exercise                                       |
| No progress tracking                        | Stores Range-of-Motion and exercise metrics in a database for longitudinal analysis     |
| Limited communication with therapists       | Interactive AI coach that answers rehabilitation-related questions safely and naturally |
| Users must stop exercising to ask questions | Hands-free voice interaction via the "Hey Coach" wake phrase                            |

# Construit un APK Android depuis le bundle web, via Capacitor.
#
#   docker build -f docker/android.Dockerfile --target apk \
#     --output type=local,dest=./out .
#   # → ./out/app-debug.apk
#
# L'image est volumineuse (~4 Go : JDK + SDK Android) et la première
# construction est longue : le SDK et les dépendances Gradle se téléchargent.
# Les couches sont ordonnées pour que seules les dernières se rejouent ensuite.

FROM node:22-bookworm AS android

ENV ANDROID_SDK_ROOT=/opt/android-sdk \
    JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64 \
    GRADLE_USER_HOME=/opt/gradle

# Capacitor 8 exige Java 21 et le SDK Android 36.
RUN apt-get update && apt-get install -y --no-install-recommends \
      openjdk-21-jdk-headless unzip wget ca-certificates git \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p "$ANDROID_SDK_ROOT/cmdline-tools" \
    && wget -qO /tmp/tools.zip https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip \
    && unzip -q /tmp/tools.zip -d "$ANDROID_SDK_ROOT/cmdline-tools" \
    && mv "$ANDROID_SDK_ROOT/cmdline-tools/cmdline-tools" "$ANDROID_SDK_ROOT/cmdline-tools/latest" \
    && rm /tmp/tools.zip

ENV PATH="$PATH:$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:$ANDROID_SDK_ROOT/platform-tools"

RUN yes | sdkmanager --licenses > /dev/null \
    && sdkmanager --install "platform-tools" "platforms;android-36" "build-tools;36.0.0" > /dev/null

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# Le projet natif est généré ici : android/ n'a pas besoin d'être versionné.
RUN npm run build \
    && npx cap add android \
    && npx cap sync android

RUN cd android && ./gradlew --no-daemon assembleDebug

# --- APK seul, extractible avec --output ---
FROM scratch AS apk
COPY --from=android /app/android/app/build/outputs/apk/debug/app-debug.apk /

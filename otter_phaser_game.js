// otter_phaser_game.js with sprite animations
import * as Phaser from "https://cdn.jsdelivr.net/npm/phaser@3.70.0/dist/phaser.esm.min.js";

const isMobile = window.innerWidth < 768;
let state = {
    hunger: 50,
    energy: 50,
    mood: "happy"
};

let otter, appleGroup, ball, moodText, hungerText, energyText;
let otterTarget = { x: 400, y: 300 };
let wanderTimer = 0;
let speechBubble;
let playingWithBall = false;
let ballPlayTimer = 0;
let bounceCenterY = 400;

export default class OtterGame extends Phaser.Scene {
    constructor() {
        super("OtterGame");
    }

    preload() {
        // Load otter animation frames
        this.load.image("otter_run_1", "assets/otter_run_1.png");
        this.load.image("otter_run_2", "assets/otter_run_2.png");
        this.load.image("otter_run_3", "assets/otter_run_3.png");

        this.load.image("otter_idle_1", "assets/otter_idle_1.png");
        this.load.image("otter_idle_2", "assets/otter_idle_2.png");
        this.load.image("otter_idle_3", "assets/otter_idle_3.png");
        this.load.image("otter_idle_4", "assets/otter_idle_4.png");

        this.load.image("otter_sleep_1", "assets/otter_sleep_1.png");
        this.load.image("otter_sleep_2", "assets/otter_sleep_2.png");
        this.load.image("otter_sleep_3", "assets/otter_sleep_3.png");

        this.load.image("apple", "assets/apple.png");
        this.load.image("ball", "assets/ball.png");
        this.load.image("sparkle", "assets/sparkle.png");

        this.load.audio("sound_happy", "assets/sound_happy.ogg");
        this.load.audio("sound_hungry", "assets/sound_hungry.ogg");
        this.load.audio("sound_sleepy", "assets/sound_sleepy.ogg");
    }

    create() {
        const scaleConfig = {
            otter: isMobile ? 0.3: 0.6,
            ball: isMobile ? 0.025: 0.05,
            apple: isMobile ? 0.025: 0.05
        };

        
        let scoreTextColor = "#fff";
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;
        
        
        otter = this.add.sprite(centerX, centerY, "otter_idle_1").setScale(scaleConfig.otter);

        this.anims.create({
            key: "walk",
            frames: [
                { key: "otter_run_1" },
                { key: "otter_run_2" },
                { key: "otter_run_3" }
            ],
            frameRate: 6,
            repeat: -1
        });

        this.anims.create({
            key: "idle",
            frames: [
                { key: "otter_idle_1" },
                { key: "otter_idle_2" },
                { key: "otter_idle_3" },
                { key: "otter_idle_4" }
            ],
            frameRate: 4,
            repeat: -1
        });

        this.anims.create({
            key: "sleep",
            frames: [
                { key: "otter_sleep_1" },
                { key: "otter_sleep_2" },
                { key: "otter_sleep_3" }
            ],
            frameRate: 3,
            repeat: -1
        });

        this.sparkle = this.add.particles(0, 0, 'sparkle', {
            quantity: 10,
            speed: { min: -40, max: 40 },
            angle: { min: 0, max: 360 },
            lifespan: 700,
            scale: { start: 0.4, end: 0 },
            alpha: { start: 1, end: 0 },
            emitting: false
        });

        const btnStyle = {
            fontSize: isMobile ? "18px" : "20px",
            backgroundColor: "#eee",
            color: "#000",
            padding: { left: 6, right: 6, top: 10, bottom: 10 },
            fixedWidth: isMobile ? 160 : 180,
            fixedHeight: isMobile ? 40 : 45,
            align: "center"
        };

        function createButton(scene, x, y, label, action) {
            const btn = scene.add.text(x, y, label, btnStyle)
                .setInteractive({ useHandCursor: true })
                .on("pointerdown", () => {
                    btn.setScale(0.95);
                    scene.time.delayedCall(100, () => {
                        btn.setScale(1);
                        action();
                    });
                });
            return btn;
        }

        appleGroup = this.add.group();

        ball = this.add.sprite(700, bounceCenterY, "ball").setVisible(false).setScale(scaleConfig.ball);
        ball.setInteractive();

        hungerText = this.add.text(20, 20, "Hunger: " + state.hunger, { fontSize: "20px", fill: scoreTextColor });
        energyText = this.add.text(20, 50, "Energy: " + state.energy, { fontSize: "20px", fill: scoreTextColor });
        moodText = this.add.text(20, 80, "Mood: " + state.mood, { fontSize: "20px", fill: scoreTextColor });

        speechBubble = this.add.text(0, 0, "", { fontSize: "16px", fill: "#000", backgroundColor: "#ffffff" });
        speechBubble.setPadding(10);
        speechBubble.setVisible(false);

        this.sounds = {
            happy: this.sound.add("sound_happy"),
            hungry: this.sound.add("sound_hungry"),
            sleepy: this.sound.add("sound_sleepy")
        };

        this.lastMood = state.mood;

        const buttonX = this.scale.width - (isMobile ? 180 : 200);
        let buttonY = 20;
        const buttonGap = isMobile ? 70 : 75;

        createButton(this, buttonX, buttonY, "🍎 Apple", () => {
            const x = otter.x + Phaser.Math.Between(-50, 50);
            const targetY = otter.y + Phaser.Math.Between(-30, 30);
            const fallingApple = this.add.sprite(x, -50, "apple").setScale(scaleConfig.apple);
            this.tweens.add({
                targets: fallingApple,
                y: targetY,
                duration: 1000,
                ease: 'Bounce.easeOut',
                onComplete: () => appleGroup.add(fallingApple)
            });
        });
        buttonY += buttonGap;

        createButton(this, buttonX, buttonY, "🥎 Ball", () => {
            ball.setVisible(true);
            ball.setPosition(Phaser.Math.Between(100, 700), bounceCenterY);
        });
        buttonY += buttonGap;

        createButton(this, buttonX, buttonY, "🧬 Shower", () => {
            state.mood = "happy";
            const sponge = this.add.text(otter.x - 40, otter.y, "🧽", { fontSize: "24px" });
            this.tweens.add({
                targets: sponge,
                x: { getStart: () => otter.x - 40, getEnd: () => otter.x + 40 },
                y: { getStart: () => otter.y, getEnd: () => otter.y },
                duration: 200,
                yoyo: true,
                repeat: 4,
                ease: 'Sine.easeInOut',
                onUpdate: () => { sponge.y = otter.y; },
                onComplete: () => {
                    sponge.destroy();
                    this.sparkle.setPosition(otter.x, otter.y - 20);
                    this.sparkle.explode();
                }
            });
        });
        buttonY += buttonGap;

        createButton(this, buttonX, buttonY, "🍌 Sleep", () => {
            state.energy = Math.min(100, state.energy + 40);
        });
    }

    update() {
        state.hunger += 0.05;
        state.energy -= 0.03;

        if (state.energy < 30) {
            state.mood = "sleepy";
        } else if (state.hunger > 70) {
            state.mood = "hungry";
        } else {
            state.mood = "happy";
        }

        if (this.lastMood !== state.mood) {
            this.lastMood = state.mood;
            const s = this.sounds[state.mood];
            if (s) s.play();
        }

        if (state.mood === "sleepy") {
            otter.play("sleep", true);
        } else if (state.mood === "hungry") {
            otter.play("idle", true);
        } else {
            otter.play("walk", true);
        }

        hungerText.setText("Hunger: " + Math.floor(state.hunger));
        energyText.setText("Energy: " + Math.floor(state.energy));
        moodText.setText("Mood: " + state.mood);

        if (state.mood === "hungry") {
            speechBubble.setText("I'm hungry!");
            speechBubble.setPosition(otter.x + 30, otter.y - 60);
            speechBubble.setVisible(true);
        } else if (state.mood === "sleepy") {
            speechBubble.setText("I'm sleepy...");
            speechBubble.setPosition(otter.x + 30, otter.y - 60);
            speechBubble.setVisible(true);
        } else {
            speechBubble.setVisible(false);
        }

        if (playingWithBall) {
            ballPlayTimer--;
            ball.y = bounceCenterY + Math.sin(ballPlayTimer / 5) * 10;
            if (ballPlayTimer <= 0) {
                playingWithBall = false;
                ball.setVisible(false);
                ball.y = bounceCenterY;
            }
            return;
        }

        let target = null;
        if (appleGroup.getChildren().length > 0) {
            target = appleGroup.getChildren()[0];
        } else if (ball.visible) {
            target = ball;
        } else {
            wanderTimer--;
            if (wanderTimer <= 0) {
                wanderTimer = 180;
                otterTarget.x = Phaser.Math.Between(100, 700);
                otterTarget.y = Phaser.Math.Between(100, 500);
            }
            target = otterTarget;
        }

        if (target) {
            let dx = target.x - otter.x;
            let dy = target.y - otter.y;
            let dist = Math.sqrt(dx * dx + dy * dy);

            if (appleGroup.contains(target) && dist < 10) {
                state.hunger = Math.max(0, state.hunger - 30);
                target.destroy();
                return;
            }
            if (dist > 1) {
                otter.x += 1.2 * dx / dist;
                otter.y += 1.2 * dy / dist;
            } else if (target === ball && !playingWithBall) {
                playingWithBall = true;
                ballPlayTimer = 60 * 5;
            }
        }
    }
}
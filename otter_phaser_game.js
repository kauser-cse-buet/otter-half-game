// otter_phaser_game.js
import * as Phaser from "https://cdn.jsdelivr.net/npm/phaser@3.70.0/dist/phaser.esm.min.js";


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
        this.load.image("happy", "assets/otter_happy.png");
        this.load.image("sleepy", "assets/otter_sleepy.png");
        this.load.image("hungry", "assets/otter_hungry.png");
        this.load.image("apple", "assets/apple.png");
        this.load.image("ball", "assets/ball.png");
        this.load.image("sparkle", "assets/sparkle.png");

        this.load.audio("sound_happy", "assets/sound_happy.ogg");
        this.load.audio("sound_hungry", "assets/sound_hungry.ogg");
        this.load.audio("sound_sleepy", "assets/sound_sleepy.ogg");

    }

    create() {
        let scoreTextColor = "#fff";
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;
        otter = this.add.sprite(centerX, centerY, state.mood).setScale(this.scale.width < 500 ? 0.25 : 0.3);

        this.sparkle = this.add.particles(0, 0, 'sparkle', {
            frame: null,                     // Only if using atlas
            quantity: 10,
            speed: { min: -40, max: 40 },
            angle: { min: 0, max: 360 },
            lifespan: 700,
            scale: { start: 0.4, end: 0 },
            alpha: { start: 1, end: 0 },
            emitting: false
        });
        
        



        appleGroup = this.add.group();

        ball = this.add.sprite(700, bounceCenterY, "ball").setVisible(false).setScale(0.1);
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

        const btnStyle = { fontSize: "18px", backgroundColor: "#eee", color: "#000", padding: 10 };

        const rightX = this.scale.width - 160;
        this.add.text(rightX, 20, "🍎 Apple", btnStyle).setInteractive().on("pointerdown", () => {
            const x = otter.x + Phaser.Math.Between(-50, 50);
            const targetY = otter.y + Phaser.Math.Between(-30, 30);
            const fallingApple = this.add.sprite(x, -50, "apple").setScale(0.15);
            this.tweens.add({
                targets: fallingApple,
                y: targetY,
                duration: 1000,
                ease: 'Bounce.easeOut',
                onComplete: () => {
                    appleGroup.add(fallingApple);
                    
                }
            });
        });

        this.add.text(rightX, 60, "🥎 Ball", btnStyle).setInteractive().on("pointerdown", () => {
            ball.setVisible(true);
            ball.setPosition(Phaser.Math.Between(100, 700), bounceCenterY);
        });

        this.add.text(620, 100, "🧼 Shower", btnStyle).setInteractive().on("pointerdown", () => {
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
        
                    // 🎇 Sparkle particle explosion
                    this.sparkle.setPosition(otter.x, otter.y - 20);
                    this.sparkle.explode();                    
                }
            });
        });
        
        
                
        

        this.add.text(rightX, 140, "💤 Sleep", btnStyle).setInteractive().on("pointerdown", () => {
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

        otter.setTexture(state.mood);

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
                ball.y = bounceCenterY; // Reset position
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

            // If close to apple, eat it
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

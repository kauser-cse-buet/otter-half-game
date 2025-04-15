import asyncio
import pygame
import sys
import os
import random
import math

# /// script
# dependencies = ["pygame-ce"]
# ///

if sys.platform == "emscripten":
    import platform
    platform.window.canvas.style.imageRendering = "pixelated"

pygame.init()
pygame.mixer.init()

# Screen setup
WIDTH, HEIGHT = 800, 600
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("Thronglets")

WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
font = pygame.font.SysFont(None, 36)
speech_font = pygame.font.SysFont(None, 28)
clock = pygame.time.Clock()

# Load sprites
def load_sprite(name, size=(80, 80)):
    path = os.path.join("assets", name)
    img = pygame.image.load(path).convert_alpha()
    return pygame.transform.scale(img, size)

def load_sound(name):
    if sys.platform == "emscripten":
        name = name.replace(".wav", ".ogg")
    return pygame.mixer.Sound(os.path.join("assets", name))

sprites = {
    "happy": load_sprite("otter_happy.png"),
    "sleepy": load_sprite("otter_sleepy.png"),
    "hungry": load_sprite("otter_hungry.png"),
    "apple": load_sprite("apple.png", (40, 40)),
    "ball": load_sprite("ball.png", (40, 40)),
    "icon_apple": load_sprite("icon_apple.png", (40, 40)),
    "icon_ball": load_sprite("icon_ball.png", (40, 40)),
    "icon_bath": load_sprite("icon_bath.png", (40, 40)),
    "icon_sleep": load_sprite("icon_sleep.png", (40, 40)),
    "bubble": [load_sprite(f"bubble_{i}.png", (20, 20)) for i in range(1, 4)],
    "giggle": [load_sprite(f"otter_giggle_{i}.png") for i in range(1, 4)]
}

sounds = {
    "happy": load_sound("sound_happy.wav"),
    "hungry": load_sound("sound_hungry.wav"),
    "sleepy": load_sound("sound_sleepy.wav")
}

state = {"hunger": 50, "energy": 50, "mood": "happy"}
otter_pos = [300, 250]
otter_target = otter_pos.copy()
otter_speed = 2
auto_wander_timer = 0
sound_timer = 0

context_icons = [
    ("Give Apple", "icon_apple"),
    ("Play Ball", "icon_ball"),
    ("Give Bath", "icon_bath"),
    ("Go Sleep", "icon_sleep")
]
context_menu = {"visible": False, "x": 0, "y": 0, "icons": context_icons}
apple_pos = None
ball_pos = None
foam_particles = []
dragging = False
giggle_mode = {"active": False, "frame": 0, "timer": 0}

class FoamParticle:
    def __init__(self, x, y):
        self.x = x
        self.y = y
        self.frame = 0
        self.lifetime = 20
        self.scale = random.uniform(0.8, 1.2)
        self.image = random.choice(sprites["bubble"])

    def draw(self, screen):
        size = int(20 * self.scale)
        img = pygame.transform.scale(self.image, (size, size))
        screen.blit(img, (self.x - size // 2, self.y - size // 2))

    def update(self):
        self.frame += 1
        return self.frame < self.lifetime

def update_emotion():
    if state["energy"] < 30:
        state["mood"] = "sleepy"
    elif state["hunger"] > 70:
        state["mood"] = "hungry"
    else:
        state["mood"] = "happy"

def move_otter():
    global apple_pos, ball_pos, auto_wander_timer
    target = None
    if apple_pos:
        target = apple_pos
    elif ball_pos:
        target = ball_pos
    elif state["mood"] == "happy":
        auto_wander_timer -= 1
        if auto_wander_timer <= 0:
            auto_wander_timer = 120
            otter_target[0] = random.randint(50, WIDTH - 100)
            otter_target[1] = random.randint(50, HEIGHT - 100)
        target = otter_target
    if not target:
        return
    dx = target[0] - otter_pos[0]
    dy = target[1] - otter_pos[1]
    dist = math.hypot(dx, dy)
    if dist > 1:
        otter_pos[0] += otter_speed * dx / dist
        otter_pos[1] += otter_speed * dy / dist
    if apple_pos and dist < 20:
        apple_pos = None
        state["hunger"] = max(0, state["hunger"] - 30)
    if ball_pos and dist < 20:
        ball_pos = None
        state["energy"] = max(0, state["energy"] - 15)

def draw_ui():
    screen.blit(font.render(f"Hunger: {int(state['hunger'])}", True, BLACK), (20, 20))
    screen.blit(font.render(f"Energy: {int(state['energy'])}", True, BLACK), (20, 60))
    screen.blit(font.render(f"Mood: {state['mood']}", True, BLACK), (20, 100))

def draw_speech_bubble(text):
    bubble_x = otter_pos[0] + 40
    bubble_y = otter_pos[1] - 50
    rect = pygame.Rect(bubble_x, bubble_y, 160, 40)
    pygame.draw.rect(screen, (255, 255, 255), rect, border_radius=10)
    pygame.draw.rect(screen, BLACK, rect, 2, border_radius=10)
    label = speech_font.render(text, True, BLACK)
    screen.blit(label, (bubble_x + 10, bubble_y + 8))

def draw_scene():
    if giggle_mode["active"]:
        frame = (giggle_mode["frame"] // 5) % len(sprites["giggle"])
        screen.blit(sprites["giggle"][frame], otter_pos)
    else:
        screen.blit(sprites[state["mood"]], otter_pos)
    if apple_pos:
        screen.blit(sprites["apple"], apple_pos)
    if ball_pos:
        screen.blit(sprites["ball"], ball_pos)
    for foam in foam_particles:
        foam.draw(screen)

def draw_context_menu():
    if not context_menu["visible"]:
        return
    x, y = context_menu["x"], context_menu["y"]
    for i, (_, icon_key) in enumerate(context_menu["icons"]):
        rect = pygame.Rect(x, y + i * 60, 50, 50)
        pygame.draw.rect(screen, (240, 240, 240), rect)
        pygame.draw.rect(screen, BLACK, rect, 1)
        screen.blit(sprites[icon_key], rect)

def get_icon_option_at_pos(pos):
    x, y = pos
    mx, my = context_menu["x"], context_menu["y"]
    for i, (action, _) in enumerate(context_menu["icons"]):
        rect = pygame.Rect(mx, my + i * 60, 50, 50)
        if rect.collidepoint(x, y):
            return action
    return None

async def game_loop():
    global apple_pos, ball_pos, foam_particles, dragging, auto_wander_timer, sound_timer
    while True:
        screen.fill(WHITE)
        update_emotion()
        move_otter()
        if giggle_mode["active"]:
            giggle_mode["timer"] -= 1
            giggle_mode["frame"] += 1
            if giggle_mode["timer"] <= 0:
                giggle_mode["active"] = False
        foam_particles = [f for f in foam_particles if f.update()]
        draw_scene()
        draw_ui()
        draw_context_menu()
        if state["mood"] == "hungry":
            draw_speech_bubble("I'm hungry!")
        elif state["mood"] == "sleepy":
            draw_speech_bubble("I'm sleepy...")
        sound_timer += 1
        if sound_timer > 300:
            try:
                sounds[state["mood"]].play()
            except:
                pass
            sound_timer = 0
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()
            if event.type == pygame.MOUSEBUTTONDOWN:
                if event.button == 3:
                    context_menu["visible"] = True
                    context_menu["x"], context_menu["y"] = event.pos
                elif event.button == 1:
                    if context_menu["visible"]:
                        choice = get_icon_option_at_pos(event.pos)
                        context_menu["visible"] = False
                        if choice == "Give Apple":
                            apple_pos = list(event.pos)
                        elif choice == "Play Ball":
                            ball_pos = list(event.pos)
                        elif choice == "Give Bath":
                            dragging = True
                        elif choice == "Go Sleep":
                            state["energy"] = min(100, state["energy"] + 40)
                            state["mood"] = "sleepy"
                            auto_wander_timer = 0
                    else:
                        otter_target[:] = list(event.pos)
            if event.type == pygame.MOUSEBUTTONUP:
                dragging = False
            if event.type == pygame.MOUSEMOTION and dragging:
                x, y = event.pos
                foam_particles.append(FoamParticle(x, y))
                otter_rect = pygame.Rect(otter_pos[0], otter_pos[1], 80, 80)
                if otter_rect.collidepoint(event.pos):
                    state["mood"] = "happy"
                    giggle_mode["active"] = True
                    giggle_mode["timer"] = 20
                    giggle_mode["frame"] = 0
        state["hunger"] += 0.02
        state["energy"] -= 0.01
        if state["mood"] == "happy" and auto_wander_timer <= 0:
            auto_wander_timer = 1
        pygame.display.update()
        await asyncio.sleep(0)
        clock.tick(60)

asyncio.run(game_loop())

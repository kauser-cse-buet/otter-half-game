pip install pygbag==0.7.2


rm -r build/
pygbag --build main.py
cp -r assets/ build/web/
cp main.py build/web/

python -m http.server 8000
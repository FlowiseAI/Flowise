import textwrap
import pprint
import tkinter as tk
from tkinter import scrolledtext

nutrition_guide = {
    # ... (same as before)
}

def format_text(text, width=80):
    return textwrap.fill(text, width)

def display_guide():
    guide_text = ""
    for food, description in nutrition_guide.items():
        guide_text += f"{food}:\n"
        formatted_description = format_text(description)
        guide_text += formatted_description + "\n\n"
    return guide_text

def display_console_guide():
    print("The Ultimate Guide to the Most Naturally Nutritious Foods for Humans\n")
    console_output = display_guide()
    print(console_output)

def display_gui_guide():
    gui = tk.Tk()
    gui.title("Nutrition Guide")

    text_widget = scrolledtext.ScrolledText(gui, wrap=tk.WORD, width=80, height=30)
    text_widget.insert(tk.END, display_guide())
    text_widget.config(state=tk.DISABLED)
    text_widget.pack()

    gui.mainloop()

def main():
    print("Welcome to the Nutrition Guide App!")
    choice = input("How would you like to view the guide?\n"
                   "1. Console\n"
                   "2. GUI\n"
                   "Enter the number of your choice: ")

    if choice == "1":
        display_console_guide()
    elif choice == "2":
        display_gui_guide()
    else:
        print("Invalid choice. Please enter 1 or 2.")

if __name__ == "__main__":
    main()

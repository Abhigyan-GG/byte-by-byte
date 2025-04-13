#include <iostream>
#include <string>
#include <thread>
#include <chrono>

int main() {
    std::string letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ !";
    std::string target = "Hello World!";
    std::string current_str = "";

    while (current_str != target) {
        for (char c : letters) {
            std::string trial = current_str + c;
            std::cout << trial << std::endl;
            std::this_thread::sleep_for(std::chrono::milliseconds(10));

            if (trial == target.substr(0, current_str.length() + 1)) {
                current_str += c;
                break;
            }
        }
    }

    return 0;
}

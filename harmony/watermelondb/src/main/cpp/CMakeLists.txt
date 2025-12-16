# the minimum version of CMake.
cmake_minimum_required(VERSION 3.13)
set(CMAKE_VERBOSE_MAKEFILE on)

# 包含 FetchContent 模块
include(FetchContent)
# 声明要获取的 nlohmann/json 库信息
FetchContent_Declare(
    nlohmann_json
    GIT_REPOSITORY https://github.com/nlohmann/json.git  # 使用官方仓库
    GIT_TAG        v3.11.2  # 指定一个明确的稳定版本
)
#  执行下载并使其在构建中可用
FetchContent_MakeAvailable(nlohmann_json)

set(rnoh_watermelondb_generated_dir "${CMAKE_CURRENT_SOURCE_DIR}/generated")
file(GLOB_RECURSE rnoh_watermelondb_generated_SRC "${rnoh_watermelondb_generated_dir}/**/*.cpp")
file(GLOB rnoh_watermelondb_SRC CONFIGURE_DEPENDS *.cpp)
add_library(watermelondb SHARED ${rnoh_watermelondb_SRC} ${rnoh_watermelondb_generated_SRC})
target_include_directories(watermelondb PUBLIC ${CMAKE_CURRENT_SOURCE_DIR} ${rnoh_watermelondb_generated_dir})
target_link_libraries(watermelondb PUBLIC rnoh libnative_rdb_ndk.z.so libohpreferences.so libudmf.so nlohmann_json::nlohmann_json)



